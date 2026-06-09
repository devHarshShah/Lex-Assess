import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private serviceAccountEmail: string | null = null;
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    try {
      const clientEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
      const privateKey = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

      let auth;

      if (clientEmail && privateKey) {
        this.logger.log('Initializing Google Calendar with environment variables.');
        this.serviceAccountEmail = clientEmail;
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/calendar'],
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
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
      }

      this.calendar = google.calendar({ version: 'v3', auth });
      this.logger.log('Google Calendar service initialized.');
    } catch (error) {
      this.logger.error('Failed to initialize Google Calendar service', error);
    }
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
    if (!this.calendar || !this.serviceAccountEmail) {
      throw new Error('Google Calendar service is not initialized. Please check credentials.');
    }

    // Generate a unique Jitsi Meet link
    const roomName = `LexAssess-${details.studentName.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 10)}`;
    const meetLink = `https://meet.jit.si/${encodeURIComponent(roomName)}`;

    const event: calendar_v3.Schema$Event = {
      summary: details.summary || `Interview: ${details.studentName} & ${details.interviewerName}`,
      description: details.description || `LexAssess Professional Interview Session.\n\nJoin Meeting: ${meetLink}`,
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
    };

    try {
      const res = await this.calendar.events.insert({
        calendarId: this.serviceAccountEmail,
        requestBody: event,
      });

      return {
        eventId: res.data.id!,
        meetLink,
        htmlLink: res.data.htmlLink!,
      };
    } catch (error: any) {
      this.logger.error('Failed to create Google Calendar event', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    if (!this.calendar) return;
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete event ${eventId}`, error);
    }
  }
}
