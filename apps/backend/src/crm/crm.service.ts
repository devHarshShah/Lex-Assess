import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CrmActivityType, CrmCallOutcome, CrmLead, CrmLeadStatus, CrmPriority, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { AnalyticsService } from '../analytics/analytics.service';
import type { UserReportRow } from '../analytics/analytics.types';
import { READ_URL_EXPIRY_SECONDS, StorageService } from '../common/storage.service';
import { interviewEnd } from '../interview/interview-end';
import { PrismaService } from '../prisma/prisma.service';
import {
  CALL_OUTCOMES,
  CALL_OUTCOME_LABELS,
  CLOSED_STATUSES,
  CONTACT_TYPES,
  CRM_STATUSES,
  CRM_STATUS_LABELS,
  LOGGABLE_TYPES,
  PRIORITIES,
  autoStatus,
  istDayBounds,
  type CrmQueue,
  type LeadQuery,
  type LogActivityInput,
  type UpdateLeadInput,
} from './crm.types';

const PAGE_SIZE = 50;
const MAX_NOTE = 5000;

export interface LeadRow {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  college: string | null;
  specialization: string | null;
  stage: string;
  stageLabel: string;
  registeredAt: string;
  status: CrmLeadStatus;
  priority: CrmPriority;
  tags: string[];
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  contactAttempts: number;
}

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly storage: StorageService,
  ) {}

  getMeta() {
    return {
      statuses: CRM_STATUSES.map((key) => ({ key, label: CRM_STATUS_LABELS[key], closed: CLOSED_STATUSES.has(key) })),
      outcomes: CALL_OUTCOMES.map((key) => ({ key, label: CALL_OUTCOME_LABELS[key] })),
      priorities: PRIORITIES,
      activityTypes: LOGGABLE_TYPES,
    };
  }

  // ---- leads ----------------------------------------------------------------------------

  // Students with a completed profile and a phone number, joined with their CRM state.
  private async allLeads(search?: string): Promise<LeadRow[]> {
    const rows = (await this.analytics.buildRows({ role: 'USER', search })).filter((r) => r.profileComplete && r.mobile);
    const leads = await this.prisma.crmLead.findMany({ where: { userId: { in: rows.map((r) => r.id) } } });
    const byUser = new Map(leads.map((l) => [l.userId, l]));
    return rows.map((r) => this.toLeadRow(r, byUser.get(r.id)));
  }

  private toLeadRow(r: UserReportRow, lead?: CrmLead | null): LeadRow {
    return {
      userId: r.id,
      name: r.name,
      email: r.email,
      mobile: r.mobile ?? '',
      college: r.college,
      specialization: r.specialization,
      stage: r.stage,
      stageLabel: r.stageLabel,
      registeredAt: r.registeredAt,
      status: lead?.status ?? 'NEW',
      priority: lead?.priority ?? 'MEDIUM',
      tags: lead?.tags ?? [],
      nextFollowUpAt: lead?.nextFollowUpAt?.toISOString() ?? null,
      lastContactedAt: lead?.lastContactedAt?.toISOString() ?? null,
      contactAttempts: lead?.contactAttempts ?? 0,
    };
  }

  private inQueue(l: LeadRow, queue: CrmQueue, bounds: { start: Date; end: Date }) {
    const due = l.nextFollowUpAt ? new Date(l.nextFollowUpAt) : null;
    if (queue === 'due') return !!due && due >= bounds.start && due <= bounds.end;
    if (queue === 'overdue') return !!due && due < bounds.start;
    if (queue === 'new') return l.status === 'NEW' && l.contactAttempts === 0;
    return true;
  }

  private async filterLeads(q: LeadQuery) {
    const queue = (['due', 'overdue', 'new', 'all'].includes(q.queue ?? '') ? q.queue : 'all') as CrmQueue;
    const bounds = istDayBounds();
    const college = q.college?.trim().toLowerCase();
    const filtered = (await this.allLeads(q.search)).filter(
      (l) =>
        (!q.status || l.status === q.status) &&
        (!q.stage || l.stage === q.stage) &&
        (!college || (l.college ?? '').toLowerCase().includes(college)),
    );

    const queueCounts = {
      due: filtered.filter((l) => this.inQueue(l, 'due', bounds)).length,
      overdue: filtered.filter((l) => this.inQueue(l, 'overdue', bounds)).length,
      new: filtered.filter((l) => this.inQueue(l, 'new', bounds)).length,
      all: filtered.length,
    };

    // Follow-ups first (soonest due), then never-contacted, then most recently registered
    const rows = filtered
      .filter((l) => this.inQueue(l, queue, bounds))
      .sort(
        (a, b) =>
          (a.nextFollowUpAt ?? '9999').localeCompare(b.nextFollowUpAt ?? '9999') ||
          a.contactAttempts - b.contactAttempts ||
          b.registeredAt.localeCompare(a.registeredAt),
      );

    return { queue, queueCounts, rows };
  }

  async listLeads(q: LeadQuery) {
    const { queue, queueCounts, rows } = await this.filterLeads(q);
    const page = Math.max(1, Math.floor(Number(q.page)) || 1);
    return {
      queue,
      queueCounts,
      total: rows.length,
      page,
      pageSize: PAGE_SIZE,
      rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    };
  }

  async getLead(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        crmLead: true,
        crmActivities: {
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: { actor: { select: { id: true, name: true } } },
        },
        companyInterviewsAsStudent: {
          orderBy: { scheduledAt: 'desc' },
          include: { company: { select: { id: true, email: true, companyProfile: { select: { companyName: true } } } } },
        },
        interviewsAsStudent: {
          orderBy: { createdAt: 'desc' },
          include: { slot: { select: { startTime: true } }, interviewer: { select: { name: true } } },
        },
        emailRecipients: {
          where: { status: 'SENT' },
          orderBy: { sentAt: 'desc' },
          take: 50,
          include: { campaign: { select: { id: true, name: true, subject: true } } },
        },
      },
    });
    if (!user || user.role !== 'USER') throw new NotFoundException('Student not found');
    const [row] = await this.analytics.rowsForUsers([userId]);

    return {
      lead: this.toLeadRow(row!, user.crmLead),
      profile: user.profile
        ? {
            fullName: user.profile.fullName,
            countryCode: user.profile.countryCode,
            mobileNumber: user.profile.mobileNumber,
            college: user.profile.college,
            degree: user.profile.degree,
            currentYear: user.profile.currentYear,
            specialization: user.profile.specialization,
            linkedinUrl: user.profile.linkedinUrl,
            // Private bucket: hand out a short-lived link
            resumeUrl: await this.storage.getSignedUrl(user.profile.resumeUrl, READ_URL_EXPIRY_SECONDS),
            internshipGoal: user.profile.internshipGoal,
            isComplete: user.profile.isComplete,
            rollNumber: user.profile.rollNumber,
          }
        : null,
      payments: {
        hasActiveSubscription: row!.hasActiveSubscription,
        trialEndsAt: row!.trialEndsAt,
        accessEndsAt: row!.accessEndsAt,
        paymentCount: row!.paymentCount,
        totalPaidInr: row!.totalPaidInr,
        lastPaymentAt: row!.lastPaymentAt,
        couponCode: row!.couponCode,
      },
      marketingUnsubscribed: !!user.marketingUnsubscribedAt,
      activities: user.crmActivities.map((a) => ({
        id: a.id,
        type: a.type,
        callOutcome: a.callOutcome,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        note: a.note,
        followUpAt: a.followUpAt,
        durationSec: a.durationSec,
        stageAtActivity: a.stageAtActivity,
        actorName: a.actor?.name ?? null,
        createdAt: a.createdAt,
      })),
      companyInterviews: user.companyInterviewsAsStudent.map((ci) => ({
        id: ci.id,
        companyName: ci.company.companyProfile?.companyName ?? ci.company.email,
        scheduledAt: ci.scheduledAt,
        endTime: interviewEnd(ci),
        status: ci.status,
        source: ci.source,
        meetLink: ci.meetLink,
      })),
      interviews: user.interviewsAsStudent.map((i) => ({
        id: i.id,
        interviewerName: i.interviewer.name,
        startTime: i.slot?.startTime ?? null,
        status: i.status,
        marks: i.marks,
      })),
      emails: user.emailRecipients.map((r) => ({
        campaignId: r.campaign.id,
        campaignName: r.campaign.name,
        subject: r.campaign.subject,
        sentAt: r.sentAt,
      })),
    };
  }

  // ---- writes ---------------------------------------------------------------------------

  private async requireStudent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user || user.role !== 'USER') throw new NotFoundException('Student not found');
  }

  async stageOf(userId: string): Promise<string | null> {
    const [row] = await this.analytics.rowsForUsers([userId]);
    return row?.stage ?? null;
  }

  private parseStatus(value: string | null | undefined): CrmLeadStatus | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (!CRM_STATUSES.includes(value as CrmLeadStatus)) throw new BadRequestException('Unknown status');
    return value as CrmLeadStatus;
  }

  private parseFutureDate(value: string | null | undefined, label: string): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${label}`);
    return d;
  }

  private cleanNote(note: string | null | undefined) {
    const n = (note ?? '').trim();
    if (n.length > MAX_NOTE) throw new BadRequestException(`Note is too long (max ${MAX_NOTE} characters)`);
    return n || null;
  }

  async logActivity(userId: string, actorId: string, input: LogActivityInput) {
    await this.requireStudent(userId);
    const type = input.type as CrmActivityType;
    if (!LOGGABLE_TYPES.includes(type)) throw new BadRequestException('Pick what you did: call, WhatsApp, email or note');
    const outcome = input.callOutcome ? (input.callOutcome as CrmCallOutcome) : null;
    if (outcome && !CALL_OUTCOMES.includes(outcome)) throw new BadRequestException('Unknown call outcome');
    if (type === 'CALL' && !outcome) throw new BadRequestException('Pick how the call went');
    if (outcome && !CONTACT_TYPES.has(type)) throw new BadRequestException('Only calls and WhatsApp messages have an outcome');
    const note = this.cleanNote(input.note);
    if (type === 'NOTE' && !note) throw new BadRequestException('Write the note');
    const followUpAt = this.parseFutureDate(input.followUpAt, 'follow-up date') ?? null;
    if (outcome === 'CALLBACK_REQUESTED' && !followUpAt) throw new BadRequestException('Set when to call back');
    const durationSec = input.durationSec == null ? null : Math.max(0, Math.floor(Number(input.durationSec)) || 0);
    const explicitStatus = this.parseStatus(input.status);

    const stage = await this.stageOf(userId);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.crmLead.findUnique({ where: { userId } });
      const current = existing?.status ?? 'NEW';
      const next = explicitStatus ?? autoStatus(current, type, outcome);
      const isContact = CONTACT_TYPES.has(type);
      // A new follow-up replaces the old one; closing a lead or reaching them clears it
      const nextFollowUpAt =
        followUpAt ?? (CLOSED_STATUSES.has(next) || (isContact && outcome === 'CONNECTED') ? null : (existing?.nextFollowUpAt ?? null));

      const lead = await tx.crmLead.upsert({
        where: { userId },
        create: {
          userId,
          status: next,
          nextFollowUpAt,
          lastContactedAt: isContact ? now : null,
          contactAttempts: isContact ? 1 : 0,
          updatedById: actorId,
        },
        update: {
          status: next,
          nextFollowUpAt,
          ...(isContact ? { lastContactedAt: now, contactAttempts: { increment: 1 } } : {}),
          updatedById: actorId,
        },
      });

      const activity = await tx.crmActivity.create({
        data: { userId, actorId, type, callOutcome: outcome, note, followUpAt, durationSec, stageAtActivity: stage, createdAt: now },
      });
      if (next !== current) {
        await tx.crmActivity.create({
          data: { userId, actorId, type: 'STATUS_CHANGE', fromStatus: current, toStatus: next, stageAtActivity: stage, createdAt: now },
        });
      }
      return { lead, activity };
    });
  }

  async updateLead(userId: string, actorId: string, input: UpdateLeadInput) {
    await this.requireStudent(userId);
    const status = this.parseStatus(input.status);
    const followUp = this.parseFutureDate(input.nextFollowUpAt, 'follow-up date');
    if (input.priority !== undefined && !PRIORITIES.includes(input.priority as CrmPriority)) {
      throw new BadRequestException('Unknown priority');
    }
    const tags =
      input.tags === undefined
        ? undefined
        : [...new Set(input.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    const note = this.cleanNote(input.note);
    const stage = await this.stageOf(userId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.crmLead.findUnique({ where: { userId } });
      const current = existing?.status ?? 'NEW';
      const next = status ?? current;
      let nextFollowUpAt = followUp === undefined ? (existing?.nextFollowUpAt ?? null) : followUp;
      if (CLOSED_STATUSES.has(next) && followUp === undefined) nextFollowUpAt = null;

      const data = {
        status: next,
        nextFollowUpAt,
        ...(input.priority ? { priority: input.priority as CrmPriority } : {}),
        ...(tags ? { tags } : {}),
        updatedById: actorId,
      };
      const lead = await tx.crmLead.upsert({ where: { userId }, create: { userId, ...data }, update: data });

      const activities: Prisma.CrmActivityCreateManyInput[] = [];
      if (next !== current) {
        activities.push({ userId, actorId, type: 'STATUS_CHANGE', fromStatus: current, toStatus: next, note, stageAtActivity: stage });
      }
      const oldFollowUp = existing?.nextFollowUpAt?.getTime() ?? null;
      if (followUp !== undefined && (followUp?.getTime() ?? null) !== oldFollowUp) {
        activities.push({ userId, actorId, type: 'FOLLOW_UP_SET', followUpAt: followUp, note: next === current ? note : null, stageAtActivity: stage });
      }
      if (activities.length) await tx.crmActivity.createMany({ data: activities });
      return lead;
    });
  }

  // Timeline entry written by other features (e.g. company interview scheduling) inside their transaction.
  systemActivity(
    userId: string,
    actorId: string | null,
    type: CrmActivityType,
    note: string,
    stage: string | null,
  ): Prisma.CrmActivityUncheckedCreateInput {
    return { userId, actorId, type, note, stageAtActivity: stage };
  }

  async isDoNotContact(userId: string) {
    const lead = await this.prisma.crmLead.findUnique({ where: { userId }, select: { status: true } });
    return lead?.status === 'DO_NOT_CONTACT';
  }

  // ---- export ---------------------------------------------------------------------------

  async buildWorkbook(q: LeadQuery): Promise<Buffer> {
    const { rows } = await this.filterLeads(q);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Leads', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'College', key: 'college', width: 28 },
      { header: 'Specialization', key: 'specialization', width: 22 },
      { header: 'Funnel stage', key: 'stageLabel', width: 28 },
      { header: 'CRM status', key: 'statusLabel', width: 22 },
      { header: 'Priority', key: 'priority', width: 10 },
      { header: 'Tags', key: 'tags', width: 20 },
      { header: 'Attempts', key: 'contactAttempts', width: 10 },
      { header: 'Last contacted', key: 'lastContactedAt', width: 18 },
      { header: 'Next follow-up', key: 'nextFollowUpAt', width: 18 },
      { header: 'Registered on', key: 'registeredAt', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    const date = (s: string | null) => (s ? new Date(s) : null);
    for (const r of rows) {
      ws.addRow({
        ...r,
        statusLabel: CRM_STATUS_LABELS[r.status],
        tags: r.tags.join(', '),
        lastContactedAt: date(r.lastContactedAt),
        nextFollowUpAt: date(r.nextFollowUpAt),
        registeredAt: date(r.registeredAt),
      });
    }
    for (const key of ['lastContactedAt', 'nextFollowUpAt', 'registeredAt']) ws.getColumn(key).numFmt = 'dd-mmm-yyyy hh:mm';
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
