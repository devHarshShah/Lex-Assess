import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CompanyInterview, CrmActivityType, Prisma } from '@prisma/client';
import { CrmService } from '../crm/crm.service';
import { GoogleCalendarService } from '../mail/google-calendar.service';
import { MailService, TEST_EMAIL_RECIPIENT, formatIstDateTime } from '../mail/mail.service';
import type { CompanyInterviewEmailVariant } from '../mail/templates/CompanyInterviewEmail';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_INTERVIEW_MS, interviewEnd } from './interview-end';

export interface InterviewInviteInput {
  // Set for reschedule/cancel previews; otherwise companyId + studentId pick the pair
  interviewId?: string;
  variant?: CompanyInterviewEmailVariant;
  companyId?: string;
  studentId?: string;
  start?: string;
  durationMin?: number;
  message?: string | null;
  extraAttendees?: string[];
  manualMeetLink?: string | null;
  reason?: string | null;
}

export interface CompanyInterviewListQuery {
  status?: string;
  companyId?: string;
  source?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: string;
}

const PAGE_SIZE = 50;
const MAX_MESSAGE = 3000;
const MAX_EXTRA_ATTENDEES = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MEET_PLACEHOLDER = 'https://meet.google.com/xxx-xxxx-xxx';

type Ctx = Awaited<ReturnType<CompanyInterviewAdminService['buildContext']>>;
type Rendered = { subject: string; html: string; text: string };

@Injectable()
export class CompanyInterviewAdminService {
  private readonly logger = new Logger(CompanyInterviewAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: GoogleCalendarService,
    private readonly mail: MailService,
    private readonly crm: CrmService,
  ) {}

  // ---- pickers --------------------------------------------------------------------------

  async searchStudents(search?: string) {
    const q = search?.trim();
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        isComplete: true,
        user: { role: 'USER' },
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { college: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { user: { select: { id: true, email: true } } },
    });
    return profiles.map((p) => ({
      id: p.user.id,
      name: p.fullName,
      email: p.user.email,
      college: p.college,
      specialization: p.specialization,
    }));
  }

  async searchCompanies(search?: string) {
    const q = search?.trim();
    const companies = await this.prisma.companyProfile.findMany({
      where: {
        verificationStatus: 'APPROVED',
        user: { role: 'COMPANY' },
        ...(q
          ? {
              OR: [
                { companyName: { contains: q, mode: 'insensitive' } },
                { companyLegalName: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { companyName: 'asc' },
      take: 20,
      include: { user: { select: { id: true, email: true } } },
    });
    return companies.map((c) => ({
      id: c.user.id,
      name: c.companyName,
      email: c.user.email,
      contactName: c.operatorName,
    }));
  }

  // ---- validation + context -------------------------------------------------------------

  private parseStart(value: string | undefined) {
    if (!value) throw new BadRequestException('Pick a date and time');
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid date and time');
    if (start.getTime() < Date.now()) throw new BadRequestException('The interview time is in the past');
    return start;
  }

  private parseDuration(value: number | undefined) {
    const d = Math.floor(Number(value ?? 60));
    if (!Number.isFinite(d) || d < 15 || d > 240) throw new BadRequestException('Duration must be between 15 and 240 minutes');
    return d;
  }

  private parseMessage(value: string | null | undefined) {
    const m = (value ?? '').trim();
    if (m.length > MAX_MESSAGE) throw new BadRequestException(`Message is too long (max ${MAX_MESSAGE} characters)`);
    return m || null;
  }

  private parseMeetLink(value: string | null | undefined) {
    const v = (value ?? '').trim();
    if (!v) return null;
    let url: URL;
    try {
      url = new URL(v);
    } catch {
      throw new BadRequestException('Meeting link must be a full https:// URL');
    }
    if (url.protocol !== 'https:') throw new BadRequestException('Meeting link must be a full https:// URL');
    return url.toString();
  }

  private parseAttendees(list: string[] | undefined, exclude: string[]) {
    const skip = new Set(exclude.map((e) => e.toLowerCase()));
    const out = [...new Set((list ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))].filter((e) => !skip.has(e));
    const bad = out.find((e) => !EMAIL_RE.test(e));
    if (bad) throw new BadRequestException(`"${bad}" is not a valid email address`);
    if (out.length > MAX_EXTRA_ATTENDEES) throw new BadRequestException(`At most ${MAX_EXTRA_ATTENDEES} extra attendees`);
    return out;
  }

  private async loadPair(companyId: string | undefined, studentId: string | undefined) {
    if (!companyId || !studentId) throw new BadRequestException('Pick a company and a student');
    const [student, company] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: studentId }, include: { profile: true } }),
      this.prisma.user.findUnique({ where: { id: companyId }, include: { companyProfile: true } }),
    ]);
    if (!student || student.role !== 'USER') throw new NotFoundException('Student not found');
    if (!student.profile?.isComplete) throw new BadRequestException('This student has not completed their profile');
    if (!company || company.role !== 'COMPANY' || !company.companyProfile) throw new NotFoundException('Company not found');
    if (company.companyProfile.verificationStatus !== 'APPROVED') throw new BadRequestException('This company is not approved yet');
    return { student, company };
  }

  async buildContext(input: InterviewInviteInput) {
    const variant: CompanyInterviewEmailVariant = input.variant ?? (input.interviewId ? 'rescheduled' : 'scheduled');
    const existing = input.interviewId ? await this.prisma.companyInterview.findUnique({ where: { id: input.interviewId } }) : null;
    if (input.interviewId && !existing) throw new NotFoundException('Interview not found');
    if (existing && existing.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled interviews can be changed');

    const { student, company } = await this.loadPair(existing?.companyId ?? input.companyId, existing?.studentId ?? input.studentId);

    let start: Date;
    let durationMin: number;
    if (variant === 'cancelled') {
      start = existing!.scheduledAt;
      durationMin = Math.round((interviewEnd(existing!).getTime() - existing!.scheduledAt.getTime()) / 60000);
    } else {
      start = this.parseStart(input.start);
      durationMin = this.parseDuration(input.durationMin);
    }
    const end = new Date(start.getTime() + durationMin * 60000);
    const manualMeetLink = this.parseMeetLink(input.manualMeetLink);
    const extraAttendees = existing
      ? existing.extraAttendees
      : this.parseAttendees(input.extraAttendees, [student.email, company.email]);

    return {
      variant,
      existing,
      student,
      company,
      companyName: company.companyProfile!.companyName,
      start,
      end,
      durationMin,
      message: this.parseMessage(input.message),
      reason: variant === 'cancelled' ? this.parseMessage(input.reason) : null,
      manualMeetLink,
      extraAttendees,
      // Known link for previews; a brand-new Google Meet only exists after the event is created
      meetLink: manualMeetLink ?? existing?.meetLink ?? null,
    };
  }

  private async warnings(ctx: Ctx) {
    const out: string[] = [];
    if (!this.calendar.isConfigured) {
      out.push(
        ctx.manualMeetLink || ctx.meetLink
          ? 'Google Calendar is not connected: no calendar invite will be sent, only the emails.'
          : 'Google Calendar is not connected: add a meeting link to send this interview.',
      );
    } else if (!this.calendar.canInviteAttendees) {
      out.push('Google Calendar is connected without a real Google account: the event will not invite attendees or create a Meet link.');
    }
    if (ctx.variant !== 'cancelled') {
      const excludeId = ctx.existing?.id;
      // Rows without an endTime are treated as one hour long
      const overlap: Prisma.CompanyInterviewWhereInput = {
        scheduledAt: { lt: ctx.end },
        OR: [
          { endTime: { gt: ctx.start } },
          { endTime: null, scheduledAt: { gt: new Date(ctx.start.getTime() - DEFAULT_INTERVIEW_MS) } },
        ],
      };
      const [studentClash, companyClash, lexClash] = await Promise.all([
        this.prisma.companyInterview.count({
          where: { studentId: ctx.student.id, status: 'SCHEDULED', ...overlap, ...(excludeId ? { id: { not: excludeId } } : {}) },
        }),
        this.prisma.companyInterview.count({
          where: { companyId: ctx.company.id, status: 'SCHEDULED', ...overlap, ...(excludeId ? { id: { not: excludeId } } : {}) },
        }),
        this.prisma.interview.count({
          where: { studentId: ctx.student.id, status: 'SCHEDULED', slot: { startTime: { lt: ctx.end }, endTime: { gt: ctx.start } } },
        }),
      ]);
      if (studentClash) out.push('The student already has another company interview at this time.');
      if (companyClash) out.push('The company already has another interview at this time.');
      if (lexClash) out.push('The student has a LexAssess interview at this time.');
    }
    if (await this.crm.isDoNotContact(ctx.student.id)) out.push('This student is marked "Do not contact" in the CRM.');
    return out;
  }

  // ---- rendering ------------------------------------------------------------------------

  private calendarText(ctx: Ctx, meetLink: string | null) {
    const p = ctx.student.profile!;
    return [
      `Interview between ${ctx.companyName} and ${p.fullName} (${p.college}).`,
      p.specialization ? `Practice area: ${p.specialization}` : '',
      meetLink ? `Join: ${meetLink}` : '',
      ctx.message ?? '',
      'Scheduled by the LexAssess team.',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private attendees(ctx: Ctx) {
    return [
      { email: ctx.student.email, displayName: ctx.student.profile!.fullName },
      { email: ctx.company.email, displayName: ctx.companyName },
      ...ctx.extraAttendees.map((email) => ({ email })),
    ];
  }

  private async render(ctx: Ctx, meetLink: string | null, previousStart?: Date | null) {
    const p = ctx.student.profile!;
    const base = {
      variant: ctx.variant,
      companyName: ctx.companyName,
      studentName: p.fullName,
      studentCollege: p.college,
      practiceArea: p.specialization,
      formattedDate: formatIstDateTime(ctx.start),
      durationMin: ctx.durationMin,
      previousFormattedDate: previousStart ? formatIstDateTime(previousStart) : null,
      meetLink,
      message: ctx.message,
      cancelReason: ctx.reason,
    };
    const [student, company] = await Promise.all([
      this.mail.renderCompanyInterview({ ...base, audience: 'student', recipientName: p.fullName }),
      this.mail.renderCompanyInterview({
        ...base,
        audience: 'company',
        recipientName: ctx.company.companyProfile!.operatorName || ctx.companyName,
      }),
    ]);
    return { student, company };
  }

  async preview(input: InterviewInviteInput) {
    const ctx = await this.buildContext(input);
    const meetLink = ctx.variant === 'scheduled' && !ctx.meetLink && this.calendar.canInviteAttendees ? MEET_PLACEHOLDER : ctx.meetLink;
    const emails = await this.render(ctx, meetLink, ctx.variant === 'rescheduled' ? ctx.existing?.scheduledAt : null);
    return {
      student: { to: [ctx.student.email], subject: emails.student.subject, html: emails.student.html },
      company: { to: [ctx.company.email, ...ctx.extraAttendees], subject: emails.company.subject, html: emails.company.html },
      calendar: {
        action: ctx.variant === 'scheduled' ? 'create' : ctx.variant === 'rescheduled' ? 'update' : 'delete',
        enabled: this.calendar.isConfigured,
        invitesAttendees: this.calendar.canInviteAttendees,
        summary: `Interview: ${ctx.companyName} × ${ctx.student.profile!.fullName}`,
        description: this.calendarText(ctx, meetLink),
        start: ctx.start,
        end: ctx.end,
        attendees: this.attendees(ctx).map((a) => a.email),
        meetLinkGenerated: meetLink === MEET_PLACEHOLDER,
      },
      warnings: await this.warnings(ctx),
    };
  }

  async sendTest(input: InterviewInviteInput) {
    const ctx = await this.buildContext(input);
    const meetLink = ctx.meetLink ?? MEET_PLACEHOLDER;
    const emails = await this.render(ctx, meetLink, ctx.variant === 'rescheduled' ? ctx.existing?.scheduledAt : null);
    for (const [who, mail] of [['Student', emails.student], ['Company', emails.company]] as const) {
      await this.mail.sendCompanyInterview(TEST_EMAIL_RECIPIENT, { ...mail, subject: `[TEST ${who}] ${mail.subject}` });
    }
    return { sentTo: TEST_EMAIL_RECIPIENT };
  }

  // ---- delivery -------------------------------------------------------------------------

  // Sends both sides; a failure is recorded (no sent-at stamp) and reported, never thrown.
  private async deliver(interview: CompanyInterview, ctx: Ctx, previousStart?: Date | null) {
    const emails = await this.render(ctx, interview.meetLink, previousStart);
    const result = { student: 'sent' as 'sent' | 'failed', company: 'sent' as 'sent' | 'failed' };
    const stamp: Prisma.CompanyInterviewUpdateInput = {};
    try {
      await this.mail.sendCompanyInterview(ctx.student.email, emails.student);
      stamp.studentEmailSentAt = new Date();
    } catch (error) {
      this.logger.error(`Company interview ${interview.id}: student email failed`, error as Error);
      result.student = 'failed';
    }
    try {
      for (const to of [ctx.company.email, ...interview.extraAttendees]) {
        await this.mail.sendCompanyInterview(to, emails.company);
      }
      stamp.companyEmailSentAt = new Date();
    } catch (error) {
      this.logger.error(`Company interview ${interview.id}: company email failed`, error as Error);
      result.company = 'failed';
    }
    const updated = Object.keys(stamp).length
      ? await this.prisma.companyInterview.update({ where: { id: interview.id }, data: stamp })
      : interview;
    return { interview: updated, emails: result };
  }

  private activity(ctx: Ctx, actorId: string, type: CrmActivityType, stage: string | null, note: string) {
    return this.crm.systemActivity(ctx.student.id, actorId, type, note, stage);
  }

  // ---- schedule / reschedule / cancel ---------------------------------------------------

  async schedule(input: InterviewInviteInput, adminId: string) {
    const ctx = await this.buildContext({ ...input, interviewId: undefined, variant: 'scheduled' });
    const existing = await this.prisma.companyInterview.findUnique({
      where: { companyId_studentId: { companyId: ctx.company.id, studentId: ctx.student.id } },
    });
    if (existing?.status === 'SCHEDULED') {
      throw new ConflictException('This student already has an interview scheduled with this company. Reschedule it instead.');
    }
    if (existing?.status === 'COMPLETED') {
      throw new ConflictException('This student has already completed an interview with this company.');
    }
    if (!this.calendar.isConfigured && !ctx.manualMeetLink) {
      throw new BadRequestException('Google Calendar is not connected. Add a meeting link to schedule without it.');
    }

    const stage = await this.crm.stageOf(ctx.student.id);
    let event: { eventId: string; meetLink: string } | null = null;
    if (this.calendar.isConfigured) {
      try {
        event = await this.calendar.createEvent({
          summary: `Interview: ${ctx.companyName} × ${ctx.student.profile!.fullName}`,
          description: this.calendarText(ctx, ctx.manualMeetLink),
          startTime: ctx.start,
          endTime: ctx.end,
          attendees: this.attendees(ctx),
          location: ctx.manualMeetLink ?? undefined,
        });
      } catch (error: any) {
        throw new BadRequestException(`Could not create the calendar invite: ${error?.message || 'Google Calendar error'}`);
      }
    }

    const fields = {
      scheduledAt: ctx.start,
      endTime: ctx.end,
      status: 'SCHEDULED' as const,
      source: 'SUPERADMIN' as const,
      meetLink: ctx.manualMeetLink ?? (event?.meetLink || null),
      googleEventId: event?.eventId ?? null,
      extraAttendees: ctx.extraAttendees,
      inviteMessage: ctx.message,
      scheduledById: adminId,
      rescheduleCount: 0,
      cancelledAt: null,
      cancelReason: null,
      studentEmailSentAt: null,
      companyEmailSentAt: null,
    };

    let interview: CompanyInterview;
    try {
      interview = await this.prisma.$transaction(async (tx) => {
        const row = await tx.companyInterview.upsert({
          where: { companyId_studentId: { companyId: ctx.company.id, studentId: ctx.student.id } },
          create: { companyId: ctx.company.id, studentId: ctx.student.id, ...fields },
          update: fields,
        });
        await tx.crmActivity.create({
          data: this.activity(ctx, adminId, 'INTERVIEW_SCHEDULED', stage, `Interview with ${ctx.companyName} on ${formatIstDateTime(ctx.start)} IST`),
        });
        return row;
      });
    } catch (error) {
      // Don't leave an orphan invite in people's calendars
      if (event) await this.calendar.deleteEvent(event.eventId);
      throw error;
    }

    return this.deliver(interview, ctx);
  }

  async reschedule(id: string, input: InterviewInviteInput, adminId: string) {
    const ctx = await this.buildContext({ ...input, interviewId: id, variant: 'rescheduled' });
    const before = ctx.existing!;
    const meetLink = ctx.manualMeetLink ?? before.meetLink;
    if (before.googleEventId) {
      try {
        await this.calendar.updateEvent(before.googleEventId, {
          startTime: ctx.start,
          endTime: ctx.end,
          description: this.calendarText(ctx, meetLink),
        });
      } catch (error: any) {
        throw new BadRequestException(`Could not update the calendar invite: ${error?.message || 'Google Calendar error'}`);
      }
    }
    const stage = await this.crm.stageOf(ctx.student.id);
    const interview = await this.prisma.$transaction(async (tx) => {
      const row = await tx.companyInterview.update({
        where: { id },
        data: {
          scheduledAt: ctx.start,
          endTime: ctx.end,
          meetLink,
          inviteMessage: ctx.message,
          rescheduleCount: { increment: 1 },
          studentEmailSentAt: null,
          companyEmailSentAt: null,
        },
      });
      await tx.crmActivity.create({
        data: this.activity(
          ctx,
          adminId,
          'INTERVIEW_RESCHEDULED',
          stage,
          `Interview with ${ctx.companyName} moved from ${formatIstDateTime(before.scheduledAt)} to ${formatIstDateTime(ctx.start)} IST`,
        ),
      });
      return row;
    });
    return this.deliver(interview, ctx, before.scheduledAt);
  }

  async cancel(id: string, input: InterviewInviteInput, adminId: string) {
    const ctx = await this.buildContext({ ...input, interviewId: id, variant: 'cancelled' });
    const before = ctx.existing!;
    if (before.googleEventId) await this.calendar.deleteEvent(before.googleEventId);
    const stage = await this.crm.stageOf(ctx.student.id);
    const interview = await this.prisma.$transaction(async (tx) => {
      const row = await tx.companyInterview.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: ctx.reason,
          inviteMessage: ctx.message,
          googleEventId: null,
          studentEmailSentAt: null,
          companyEmailSentAt: null,
        },
      });
      await tx.crmActivity.create({
        data: this.activity(
          ctx,
          adminId,
          'INTERVIEW_CANCELLED',
          stage,
          `Interview with ${ctx.companyName} on ${formatIstDateTime(before.scheduledAt)} IST cancelled${ctx.reason ? `: ${ctx.reason}` : ''}`,
        ),
      });
      return row;
    });
    return this.deliver(interview, ctx);
  }

  // Re-sends the latest email (invite, update or cancellation) to both sides.
  async resendEmails(id: string) {
    const interview = await this.prisma.companyInterview.findUnique({ where: { id } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.status === 'COMPLETED') throw new BadRequestException('This interview is already completed');
    const { student, company } = await this.loadPair(interview.companyId, interview.studentId);
    const variant: CompanyInterviewEmailVariant =
      interview.status === 'CANCELLED' ? 'cancelled' : interview.rescheduleCount > 0 ? 'rescheduled' : 'scheduled';
    const ctx: Ctx = {
      variant,
      existing: interview,
      student,
      company,
      companyName: company.companyProfile!.companyName,
      start: interview.scheduledAt,
      end: interviewEnd(interview),
      durationMin: Math.round((interviewEnd(interview).getTime() - interview.scheduledAt.getTime()) / 60000),
      message: interview.inviteMessage,
      reason: interview.cancelReason,
      manualMeetLink: null,
      extraAttendees: interview.extraAttendees,
      meetLink: interview.meetLink,
    };
    return this.deliver(interview, ctx);
  }

  // ---- list -----------------------------------------------------------------------------

  async list(q: CompanyInterviewListQuery) {
    const parse = (v?: string, endOfDay = false) => {
      if (!v) return undefined;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
      if (endOfDay) d.setHours(23, 59, 59, 999);
      return d;
    };
    const from = parse(q.from);
    const to = parse(q.to, true);
    const search = q.search?.trim();
    const where: Prisma.CompanyInterviewWhereInput = {
      ...(q.status && ['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(q.status) ? { status: q.status as never } : {}),
      ...(q.source && ['COMPANY', 'SUPERADMIN'].includes(q.source) ? { source: q.source as never } : {}),
      ...(q.companyId ? { companyId: q.companyId } : {}),
      ...(from || to ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(search
        ? {
            OR: [
              { student: { email: { contains: search, mode: 'insensitive' } } },
              { student: { profile: { fullName: { contains: search, mode: 'insensitive' } } } },
              { company: { companyProfile: { companyName: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const page = Math.max(1, Math.floor(Number(q.page)) || 1);
    const [total, rows] = await Promise.all([
      this.prisma.companyInterview.count({ where }),
      this.prisma.companyInterview.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          student: { select: { id: true, email: true, name: true, profile: { select: { fullName: true, college: true } } } },
          company: { select: { id: true, email: true, companyProfile: { select: { companyName: true } } } },
          scheduledBy: { select: { name: true } },
        },
      }),
    ]);
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      rows: rows.map((r) => ({
        id: r.id,
        studentId: r.student.id,
        studentName: r.student.profile?.fullName || r.student.name,
        studentEmail: r.student.email,
        studentCollege: r.student.profile?.college ?? null,
        companyId: r.company.id,
        companyName: r.company.companyProfile?.companyName ?? r.company.email,
        companyEmail: r.company.email,
        scheduledAt: r.scheduledAt,
        endTime: interviewEnd(r),
        status: r.status,
        source: r.source,
        meetLink: r.meetLink,
        hasCalendarEvent: !!r.googleEventId,
        extraAttendees: r.extraAttendees,
        inviteMessage: r.inviteMessage,
        rescheduleCount: r.rescheduleCount,
        cancelReason: r.cancelReason,
        studentEmailSentAt: r.studentEmailSentAt,
        companyEmailSentAt: r.companyEmailSentAt,
        scheduledByName: r.scheduledBy?.name ?? null,
        notes: r.notes,
      })),
    };
  }
}
