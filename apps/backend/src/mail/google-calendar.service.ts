import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth, Impersonated } from 'google-auth-library';
import { google, calendar_v3 } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

// GaxiosErrors carry the request config (refresh token included), so never log or rethrow them raw.
function describeGoogleError(error: unknown): string {
  const e = error as { message?: string; response?: { status?: number; data?: unknown } };
  const data = e?.response?.data as { error?: unknown; error_description?: unknown } | undefined;
  const detail = data?.error ? ` (${JSON.stringify(data.error)}${data.error_description ? `: ${String(data.error_description)}` : ''})` : '';
  return `${e?.message ?? String(error)}${e?.response?.status ? ` [HTTP ${e.response.status}]` : ''}${detail}`;
}

@Injectable()
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private serviceAccountEmail: string | null = null;
  // A bare GCP service account (the fallback paths below) has no Google Meet
  // provisioning, so conferenceData creation isn't possible under it - hence
  // the calendarId also differs: a real Google user's own calendar is
  // 'primary', not an email lookup. See createInterviewEvent.
  private usingRealGoogleAccount = false;
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private async initialize() {
    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
      const refreshToken = this.configService.get<string>('GOOGLE_CALENDAR_REFRESH_TOKEN');

      if (clientId && clientSecret && refreshToken) {
        // A real Google account (via one-time OAuth consent, reusing the
        // existing Google Sign-In OAuth client) rather than a bare service
        // account - this is what makes real Google Meet links possible, since
        // Meet is tied to a real user identity. See DEPLOYMENT.md for how
        // this refresh token was minted.
        this.logger.log('Initializing Google Calendar via OAuth2 refresh token (real Google account).');
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        this.usingRealGoogleAccount = true;
        this.logger.log('Google Calendar service initialized.');
        return;
      }

      const targetEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
      const privateKey = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

      let auth;

      if (targetEmail && privateKey) {
        this.logger.log('Initializing Google Calendar with a static service account key.');
        this.serviceAccountEmail = targetEmail;
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: targetEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          },
          scopes: CALENDAR_SCOPES,
        });
      } else if (targetEmail) {
        // No static key: impersonate the target service account using this
        // service's own identity (e.g. the Cloud Run runtime SA), which must
        // hold "Service Account Token Creator" on the target. No private key
        // material ever exists - this is the org-policy-friendly path.
        this.logger.log(`Initializing Google Calendar via impersonation of ${targetEmail}.`);
        this.serviceAccountEmail = targetEmail;
        const sourceClient = await new GoogleAuth().getClient();
        auth = new Impersonated({
          sourceClient,
          targetPrincipal: targetEmail,
          targetScopes: CALENDAR_SCOPES,
          lifetime: 3600,
        });
      } else {
        const credentialsPath = path.join(process.cwd(), 'google-credentials.json');

        if (!fs.existsSync(credentialsPath)) {
          this.logger.warn('Google credentials not found (env or file). Google Calendar integration is disabled.');
          return;
        }

        this.logger.log('Initializing Google Calendar with google-credentials.json.');
        try {
          const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          this.serviceAccountEmail = creds.client_email;
        } catch (e) {
          this.logger.warn('Could not parse google-credentials.json for client_email.');
        }

        auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: CALENDAR_SCOPES,
        });
      }

      this.calendar = google.calendar({ version: 'v3', auth });
      this.logger.log('Google Calendar service initialized.');
    } catch (error) {
      this.logger.error(`Failed to initialize Google Calendar service: ${describeGoogleError(error)}`);
    }
  }

  get isConfigured(): boolean {
    return !!this.calendar && (!!this.serviceAccountEmail || this.usingRealGoogleAccount);
  }

  // True when events can carry attendees and Meet links (a real Google account identity).
  get canInviteAttendees(): boolean {
    return !!this.calendar && this.usingRealGoogleAccount;
  }

  async createInterviewEvent(details: {
    studentName: string;
    studentEmail: string;
    interviewerName: string;
    interviewerEmail: string;
    startTime: Date;
    endTime: Date;
    summary?: string;
    description?: string;
  }) {
    return this.createEvent({
      summary: details.summary || `Interview: ${details.studentName} & ${details.interviewerName}`,
      description: details.description || 'LexAssess Professional Interview Session.',
      startTime: details.startTime,
      endTime: details.endTime,
      attendees: [
        { email: details.studentEmail, displayName: details.studentName },
        { email: details.interviewerEmail, displayName: details.interviewerName },
      ],
    });
  }

  async createEvent(details: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: { email: string; displayName?: string }[];
    // Use this link instead of generating a Google Meet
    location?: string;
  }) {
    if (!this.calendar || (!this.serviceAccountEmail && !this.usingRealGoogleAccount)) {
      throw new Error('Google Calendar service is not initialized. Please check credentials.');
    }

    const event: calendar_v3.Schema$Event = {
      summary: details.summary,
      description: details.description,
      ...(details.location ? { location: details.location } : {}),
      start: {
        dateTime: details.startTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: details.endTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      // Real Google Meet conferencing - only possible under a real Google
      // account identity (usingRealGoogleAccount), never a bare service
      // account, which has no Meet provisioning. Same for attendees: without
      // them the event only lives on the organizer's calendar, but a bare
      // service account can't invite attendees without Domain-Wide Delegation.
      ...(this.usingRealGoogleAccount && {
        attendees: details.attendees,
        guestsCanModify: false,
        ...(!details.location && {
          conferenceData: {
            createRequest: {
              requestId: `lexassess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      }),
    };

    try {
      const res = await this.calendar.events.insert({
        // A real Google account's own calendar is addressed as 'primary';
        // the bare-service-account fallback paths address it by email.
        calendarId: this.calendarId,
        requestBody: event,
        conferenceDataVersion: this.usingRealGoogleAccount ? 1 : undefined,
        // Google emails the invite to attendees, which is what puts the
        // event on their calendars (any provider, not just Google).
        sendUpdates: this.usingRealGoogleAccount ? 'all' : undefined,
      });

      const meetLink = res.data.hangoutLink;
      if (this.usingRealGoogleAccount && !details.location && !meetLink) {
        this.logger.warn(`Event ${res.data.id} created without a Meet link - conferenceData may not have been granted.`);
      }

      return {
        eventId: res.data.id!,
        meetLink: details.location ?? meetLink ?? '',
        htmlLink: res.data.htmlLink!,
      };
    } catch (error: any) {
      const description = describeGoogleError(error);
      this.logger.error(`Failed to create Google Calendar event: ${description}`);
      throw new Error(description);
    }
  }

  // Moves an event (and optionally replaces its guest list); Google notifies attendees.
  async updateEvent(
    eventId: string,
    changes: {
      startTime: Date;
      endTime: Date;
      summary?: string;
      description?: string;
      attendees?: { email: string; displayName?: string }[];
    },
  ) {
    if (!this.calendar) {
      throw new Error('Google Calendar service is not initialized. Please check credentials.');
    }
    try {
      await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId,
        sendUpdates: this.usingRealGoogleAccount ? 'all' : undefined,
        requestBody: {
          start: { dateTime: changes.startTime.toISOString(), timeZone: 'Asia/Kolkata' },
          end: { dateTime: changes.endTime.toISOString(), timeZone: 'Asia/Kolkata' },
          ...(changes.summary !== undefined ? { summary: changes.summary } : {}),
          ...(changes.description !== undefined ? { description: changes.description } : {}),
          ...(this.usingRealGoogleAccount && changes.attendees ? { attendees: changes.attendees } : {}),
        },
      });
    } catch (error) {
      const description = describeGoogleError(error);
      this.logger.error(`Failed to update event ${eventId}: ${description}`);
      throw new Error(description);
    }
  }

  private get calendarId(): string {
    return this.usingRealGoogleAccount ? 'primary' : this.serviceAccountEmail ?? 'primary';
  }

  async deleteEvent(eventId: string) {
    if (!this.calendar) return;
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId,
        sendUpdates: this.usingRealGoogleAccount ? 'all' : undefined,
      });
    } catch (error) {
      this.logger.error(`Failed to delete event ${eventId}: ${describeGoogleError(error)}`);
    }
  }
}
