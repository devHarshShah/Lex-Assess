import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { GoogleCalendarService } from '../mail/google-calendar.service';
import { Prisma, Role, InterviewStatus, AttemptStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { interviewEnd, DEFAULT_INTERVIEW_MS } from './interview-end';
import { CreateInterviewerDto, CreateSlotDto, ScheduleInterviewDto, AddFeedbackDto, BulkCreateSlotsDto, ReassignInterviewDto } from './dto/interview.dto';

// What a company may see of its own interview: no student id or calendar internals.
function toCompanyFacingInterview(interview: {
  id: string;
  scheduledAt: Date;
  endTime: Date | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { id, scheduledAt, endTime, notes, status, createdAt, updatedAt } = interview;
  return { id, scheduledAt, endTime, notes, status, createdAt, updatedAt };
}

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly calendarService: GoogleCalendarService,
  ) {}

  async getInterviewerSlots(interviewerId: string) {
    return this.prisma.interviewSlot.findMany({
      where: { interviewerId },
      include: { interview: { include: { student: { select: { name: true } } } } },
      orderBy: { startTime: 'asc' }
    });
  }

  async deleteSlot(userId: string, role: string, slotId: string) {
    const slot = await this.prisma.interviewSlot.findUnique({
      where: { id: slotId }
    });

    if (!slot) throw new NotFoundException('Slot not found');

    if (role !== Role.ADMIN && role !== Role.SUPERADMIN && slot.interviewerId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this slot');
    }

    if (slot.isBooked) {
      throw new BadRequestException('Cannot delete a booked slot. Please cancel the interview first.');
    }

    return this.prisma.interviewSlot.delete({ where: { id: slotId } });
  }

  async bulkAddSlots(interviewerId: string, data: BulkCreateSlotsDto) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const slots: any[] = [];

    const startParts = data.startTime.split(':').map(Number);
    const endParts = data.endTime.split(':').map(Number);
    
    const startHour = startParts[0] || 0;
    const startMin = startParts[1] || 0;
    const endHour = endParts[0] || 0;
    const endMin = endParts[1] || 0;

    const durationMs = data.durationMinutes * 60 * 1000;
    const breakMs = (data.breakMinutes || 0) * 60 * 1000;

    const pad = (n: number) => String(n).padStart(2, '0');

    let currentDay = new Date(start);
    while (currentDay <= end) {
      if (data.daysOfWeek.includes(currentDay.getDay())) {
        // Interviewers/admins enter times as India wall-clock (this product is
        // India-only). setHours() would anchor to the *server process's* local
        // timezone instead, which is UTC on Cloud Run - building an explicit
        // +05:30 ISO string keeps this correct regardless of where it runs.
        const dateStr = currentDay.toISOString().slice(0, 10);
        const dayStartTime = new Date(`${dateStr}T${pad(startHour)}:${pad(startMin)}:00+05:30`);
        const dayEndTime = new Date(`${dateStr}T${pad(endHour)}:${pad(endMin)}:00+05:30`);

        // An end time at or before the start time (e.g. 23:45 -> 12:30) means
        // the window crosses midnight into the next day, not an empty window
        // on the same day - without this, the inner loop below never runs
        // and bulkAddSlots silently returns { count: 0 } for every such day.
        if (dayEndTime <= dayStartTime) {
          dayEndTime.setDate(dayEndTime.getDate() + 1);
        }

        let currentSlotStart = new Date(dayStartTime);
        while (new Date(currentSlotStart.getTime() + durationMs) <= dayEndTime) {
          const slotEnd = new Date(currentSlotStart.getTime() + durationMs);
          
          if (currentSlotStart > new Date()) {
            slots.push({
              interviewerId,
              startTime: new Date(currentSlotStart),
              endTime: slotEnd,
              isBooked: false,
            });
          }
          // Move to next slot start by adding duration + break
          currentSlotStart = new Date(slotEnd.getTime() + breakMs);
        }
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // A silent { count: 0 } here previously came back as a 201 Created with
    // no indication anything was wrong - surface why nothing was generated
    // instead (window too short for one slot, dates already in the past, or
    // daysOfWeek not matching any day in the range) rather than a false success.
    if (slots.length === 0) {
      throw new BadRequestException(
        'No slots could be generated for this range. Check that the time window fits at least one slot of the given duration, and that the date range/selected days are not entirely in the past.',
      );
    }

    return this.prisma.interviewSlot.createMany({
      data: slots,
      skipDuplicates: true,
    });
  }

  async createInterviewer(data: CreateInterviewerDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('User with this email already exists');

    // Create user with INTERVIEWER role; password is set later via emailed token
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: Role.INTERVIEWER,
        interviewerProfile: {
          create: {
            specializations: {
              connect: data.specializations.map(name => ({ name }))
            },
            bio: data.bio,
          },
        },
      },
      include: { interviewerProfile: { include: { specializations: true } } },
    });

    try {
      await this.sendInterviewerWelcomeEmail(user.id, data.email, data.name);
    } catch (error) {
      // Don't fail the whole request if email fails, but log it
      this.logger.error('Failed to send welcome email to interviewer', error);
    }

    return user;
  }

  // Shared by createInterviewer and resendInterviewerWelcome - always issues a
  // fresh token (the old one, if any, is simply superseded; PasswordSetupToken
  // lookups already filter on usedAt/expiresAt, so a stale row is harmless).
  private async sendInterviewerWelcomeEmail(userId: string, email: string, name: string) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.passwordSetupToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    await this.mailService.sendInterviewerWelcome(email, name, token);
  }

  // Recovers an interviewer who never got (or lost) their original welcome
  // email - e.g. it was sent while the SMTP credential was misconfigured and
  // silently failed. Issues a fresh 24h token rather than trying to resend
  // whatever the original token was, which may already be expired.
  async resendInterviewerWelcome(interviewerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: interviewerId } });
    if (!user || user.role !== Role.INTERVIEWER) {
      throw new NotFoundException('Interviewer not found');
    }

    await this.sendInterviewerWelcomeEmail(user.id, user.email, user.name);
    return { success: true };
  }

  async getAllInterviewers() {
    return this.prisma.user.findMany({
      where: { role: Role.INTERVIEWER },
      include: { 
        interviewerProfile: { include: { specializations: true } },
        interviewSlots: {
          where: { startTime: { gt: new Date() } },
          orderBy: { startTime: 'asc' }
        }
      },
    });
  }

  async deleteInterviewer(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, role: Role.INTERVIEWER },
      include: { interviewsAsInterviewer: true }
    });

    if (!user) throw new NotFoundException('Interviewer not found');

    const hasBookedInterviews = user.interviewsAsInterviewer.some(i => i.status === InterviewStatus.SCHEDULED);
    if (hasBookedInterviews) {
      throw new BadRequestException('Cannot delete interviewer with scheduled interviews');
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async addSlot(data: CreateSlotDto) {
    return this.prisma.interviewSlot.create({
      data: {
        interviewerId: data.interviewerId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isBooked: false,
      },
    });
  }

  async getAvailableSlots(specialization?: string) {
    return this.prisma.interviewSlot.findMany({
      where: {
        isBooked: false,
        startTime: { gt: new Date() },
        interviewer: {
          interviewerProfile: specialization ? {
            specializations: { some: { name: specialization } }
          } : undefined
        }
      },
      include: {
        interviewer: {
          select: { id: true, name: true, interviewerProfile: { include: { specializations: true } } }
        }
      },
      orderBy: { startTime: 'asc' }
    });
  }

  async canStudentSchedule(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile || !profile.specialization) return false;

    // Check if student has submitted all papers for their specialization
    const specialization = await this.prisma.specialization.findUnique({
      where: { name: profile.specialization },
      include: {
        questionPapers: {
          include: {
            versions: {
              where: { status: 'PUBLISHED' }
            }
          }
        }
      }
    });

    if (!specialization) return false;

    const publishedVersionIds = specialization.questionPapers
      .flatMap(p => p.versions.map(v => v.id));

    if (publishedVersionIds.length === 0) return false;

    const submissions = await this.prisma.testAttempt.findMany({
      where: {
        userId,
        versionId: { in: publishedVersionIds },
        status: AttemptStatus.SUBMITTED
      }
    });

    // Check if they have at least one submission for each paper
    const submittedVersionIds = new Set(submissions.map(s => s.versionId));
    return publishedVersionIds.every(id => submittedVersionIds.has(id));
  }

  async scheduleInterview(studentId: string, data: ScheduleInterviewDto) {
    const canSchedule = await this.canStudentSchedule(studentId);
    if (!canSchedule) {
      throw new ForbiddenException('You must complete all domain tests before scheduling an interview');
    }

    // Check if student already has an interview
    const existingInterview = await this.prisma.interview.findFirst({
      where: { 
        studentId,
        status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.COMPLETED] }
      }
    });

    if (existingInterview) {
      throw new BadRequestException('You have already scheduled or completed an interview. Only one interview is allowed per student.');
    }

    const slot = await this.prisma.interviewSlot.findUnique({
      where: { id: data.slotId },
      include: { interviewer: true }
    });

    if (!slot || slot.isBooked) {
      throw new BadRequestException('Slot is no longer available');
    }

    // Book first; the Calendar event and emails follow outside the transaction so a
    // Google outage never blocks a booking (the email worker retries pending syncs).
    const interview = await this.prisma.$transaction(async (tx) => {
      await tx.interviewSlot.update({
        where: { id: slot.id },
        data: { isBooked: true }
      });

      const student = await tx.user.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundException('Student not found');

      return tx.interview.create({
        data: {
          studentId,
          interviewerId: slot.interviewerId,
          slotId: slot.id,
          status: InterviewStatus.SCHEDULED,
        },
      });
    });

    await this.trySyncCalendar(interview.id);

    const result = await this.prisma.interview.findUniqueOrThrow({
      where: { id: interview.id },
      include: {
        interviewer: true,
        student: true,
        slot: true
      }
    });
    return result;
  }

  /**
   * Creates the Calendar event (Meet link) for a booked interview, then sends the
   * scheduled emails. Returns 'failed' and leaves the row pending when Google fails;
   * syncPendingInterviews retries it. 'skipped' means there was nothing to do.
   */
  async trySyncCalendar(interviewId: string): Promise<'synced' | 'skipped' | 'failed'> {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { student: true, interviewer: true, slot: true },
    });
    // googleEventId set = an event already exists (e.g. booked by the pre-migration revision)
    if (!interview || interview.calendarSyncedAt || interview.googleEventId || interview.status !== InterviewStatus.SCHEDULED) return 'skipped';

    // Claim the attempt: if the request path and the worker race, only one creates the event
    const claimed = await this.prisma.interview.updateMany({
      where: { id: interviewId, calendarSyncedAt: null, calendarSyncAttempts: interview.calendarSyncAttempts },
      data: { calendarSyncAttempts: { increment: 1 } },
    });
    if (claimed.count === 0) return 'skipped';

    let event: { meetLink: string | null | undefined; eventId: string | null | undefined };
    try {
      event = await this.calendarService.createInterviewEvent({
        studentName: interview.student.name,
        studentEmail: interview.student.email,
        interviewerName: interview.interviewer.name,
        interviewerEmail: interview.interviewer.email,
        startTime: interview.slot.startTime,
        endTime: interview.slot.endTime,
      });
    } catch (error: any) {
      this.logger.error(`Calendar sync failed for interview ${interviewId} (attempt ${interview.calendarSyncAttempts + 1}): ${error?.message ?? error}`);
      return 'failed';
    }

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { meetLink: event.meetLink ?? null, googleEventId: event.eventId ?? null, calendarSyncedAt: new Date() },
    });

    try {
      await Promise.all([
        this.mailService.sendInterviewScheduled(
          interview.student.email,
          interview.student.name,
          interview.interviewer.name,
          interview.slot.startTime,
          event.meetLink!
        ),
        this.mailService.sendInterviewScheduled(
          interview.interviewer.email,
          interview.student.name,
          interview.interviewer.name,
          interview.slot.startTime,
          event.meetLink!
        )
      ]);
    } catch (error: any) {
      this.logger.error(`Failed to send interview scheduled emails for ${interviewId}: ${error?.message ?? error}`);
    }
    return 'synced';
  }

  /** Retries Calendar sync for bookings made while Google was failing. Called by the email worker. */
  async syncPendingInterviews(): Promise<{ pending: number; synced: number }> {
    const pending = await this.prisma.interview.findMany({
      where: {
        calendarSyncedAt: null,
        googleEventId: null,
        status: InterviewStatus.SCHEDULED,
        calendarSyncAttempts: { lt: 50 },
        slot: { endTime: { gt: new Date() } },
      },
      select: { id: true },
      // Fewest attempts first, so one row that keeps failing can't hold up newer bookings
      orderBy: [{ calendarSyncAttempts: 'asc' }, { createdAt: 'asc' }],
      take: 10,
    });
    let synced = 0;
    for (const { id } of pending) {
      const outcome = await this.trySyncCalendar(id);
      if (outcome === 'synced') synced++;
      else if (outcome === 'failed') break; // Google is still failing; don't burn attempts on the rest this tick
    }
    return { pending: pending.length, synced };
  }

  /**
   * The company's own hiring-stage interview, separate from the LexAssess interview
   * used to generate rank. A company may only schedule this once it has shortlisted
   * the candidate (a CompanyCandidateDecision exists) and the candidate has completed
   * both the test and the LexAssess interview.
   *
   * Companies identify candidates by test attempt, never by student id, so the
   * student is resolved here from the company's own decision on that attempt.
   */
  async scheduleCompanyInterview(companyId: string, attemptId: string, data: { scheduledAt: string; notes?: string }) {
    const relationship = await this.prisma.companyCandidateDecision.findUnique({
      where: { companyId_attemptId: { companyId, attemptId } },
      select: { attempt: { select: { userId: true } } },
    });

    if (!relationship) {
      throw new ForbiddenException('You are not authorized to schedule an interview for this candidate');
    }

    const studentId = relationship.attempt.userId;

    const completedLexAssessInterview = await this.prisma.interview.findFirst({
      where: { studentId, status: InterviewStatus.COMPLETED },
    });

    if (!completedLexAssessInterview) {
      throw new ForbiddenException('This candidate has not completed the LexAssess interview yet');
    }

    const student = await this.prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');

    const scheduledAt = new Date(data.scheduledAt);
    const existing = await this.prisma.companyInterview.findUnique({
      where: { companyId_studentId: { companyId, studentId } },
    });
    // Keep the existing slot length when the company moves an interview; new ones default to an hour
    const durationMs = existing ? interviewEnd(existing).getTime() - existing.scheduledAt.getTime() : DEFAULT_INTERVIEW_MS;
    const endTime = new Date(scheduledAt.getTime() + durationMs);

    const companyInterview = await this.prisma.companyInterview.upsert({
      where: { companyId_studentId: { companyId, studentId } },
      update: {
        scheduledAt,
        endTime,
        notes: data.notes,
        status: 'SCHEDULED',
      },
      create: {
        companyId,
        studentId,
        scheduledAt,
        endTime,
        notes: data.notes,
      },
    });

    // A superadmin-scheduled interview has a calendar event; keep it in step with the new time
    if (existing?.googleEventId && existing.status === 'SCHEDULED' && existing.scheduledAt.getTime() !== scheduledAt.getTime()) {
      try {
        await this.calendarService.updateEvent(existing.googleEventId, { startTime: scheduledAt, endTime });
      } catch (error) {
        this.logger.error(`Failed to move calendar event for company interview ${existing.id}`, error);
      }
    }

    return toCompanyFacingInterview(companyInterview);
  }

  async getCompanyInterviews(companyId: string) {
    // No student identity or contact details for companies; introductions go through LexAssess
    return this.prisma.companyInterview.findMany({
      where: { companyId },
      select: { id: true, scheduledAt: true, endTime: true, notes: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async completeCompanyInterview(companyId: string, companyInterviewId: string, data: { notes?: string }) {
    const companyInterview = await this.prisma.companyInterview.findUnique({
      where: { id: companyInterviewId },
    });

    if (!companyInterview || companyInterview.companyId !== companyId) {
      throw new NotFoundException('Company interview not found');
    }

    const updated = await this.prisma.companyInterview.update({
      where: { id: companyInterviewId },
      data: {
        status: 'COMPLETED',
        notes: data.notes ?? companyInterview.notes,
      },
    });
    return toCompanyFacingInterview(updated);
  }

  /** Upcoming booked LexAssess interviews, for admins to reassign when an interviewer drops out. */
  async getScheduledInterviews() {
    return this.prisma.interview.findMany({
      where: { status: InterviewStatus.SCHEDULED, slot: { endTime: { gt: new Date() } } },
      include: {
        student: { select: { id: true, name: true, email: true, profile: { select: { specialization: true } } } },
        interviewer: { select: { id: true, name: true, email: true } },
        slot: true,
      },
      orderBy: { slot: { startTime: 'asc' } },
    });
  }

  /**
   * Moves a booked interview to another interviewer. Without slotId the booking keeps its
   * time (the slot itself changes hands); with slotId it moves into one of the new
   * interviewer's open slots and the old slot is removed, since its interviewer is unavailable.
   */
  async reassignInterview(interviewId: string, data: ReassignInterviewDto) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { slot: true },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.status !== InterviewStatus.SCHEDULED || interview.slot.endTime <= new Date()) {
      throw new BadRequestException('Only upcoming scheduled interviews can be reassigned');
    }
    if (data.newInterviewerId === interview.interviewerId) {
      throw new BadRequestException('The interview is already assigned to this interviewer');
    }
    const newInterviewer = await this.prisma.user.findUnique({ where: { id: data.newInterviewerId } });
    if (!newInterviewer || newInterviewer.role !== Role.INTERVIEWER) {
      throw new NotFoundException('Interviewer not found');
    }

    // Guarded so a concurrent reassignment/feedback can't be silently overwritten
    const repoint = async (tx: Prisma.TransactionClient, extra: { slotId?: string } = {}) => {
      const moved = await tx.interview.updateMany({
        where: { id: interviewId, interviewerId: interview.interviewerId, slotId: interview.slotId, status: InterviewStatus.SCHEDULED },
        data: { interviewerId: newInterviewer.id, ...extra },
      });
      if (moved.count === 0) throw new ConflictException('This interview was changed by someone else. Please refresh and try again.');
    };

    if (data.slotId) {
      const slotId = data.slotId;
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.interviewSlot.updateMany({
          where: { id: slotId, interviewerId: newInterviewer.id, isBooked: false, startTime: { gt: new Date() } },
          data: { isBooked: true },
        });
        if (claimed.count === 0) throw new BadRequestException('Slot is no longer available');
        await repoint(tx, { slotId });
        // Only after re-pointing: deleting a slot cascades to the interview booked into it
        await tx.interviewSlot.delete({ where: { id: interview.slotId } });
      });
    } else {
      const { startTime, endTime } = interview.slot;
      const overlap = { interviewerId: newInterviewer.id, startTime: { lt: endTime }, endTime: { gt: startTime } };
      await this.prisma.$transaction(async (tx) => {
        const clash = await tx.interviewSlot.findFirst({ where: { ...overlap, isBooked: true } });
        if (clash) throw new BadRequestException(`${newInterviewer.name} already has an interview booked at this time`);
        // Their free availability at this time is now taken by this booking
        await tx.interviewSlot.deleteMany({ where: { ...overlap, isBooked: false } });
        await tx.interviewSlot.update({ where: { id: interview.slotId }, data: { interviewerId: newInterviewer.id } });
        await repoint(tx);
      });
    }

    const updated = await this.prisma.interview.findUniqueOrThrow({
      where: { id: interviewId },
      include: { interviewer: true, student: true, slot: true },
    });

    // Not synced yet: the normal sync creates the event and emails with the new details
    if (!updated.calendarSyncedAt && !updated.googleEventId) {
      await this.trySyncCalendar(interviewId);
      return updated;
    }

    if (updated.googleEventId) {
      try {
        await this.calendarService.updateEvent(updated.googleEventId, {
          startTime: updated.slot.startTime,
          endTime: updated.slot.endTime,
          summary: `Interview: ${updated.student.name} & ${updated.interviewer.name}`,
          attendees: [
            { email: updated.student.email, displayName: updated.student.name },
            { email: updated.interviewer.email, displayName: updated.interviewer.name },
          ],
        });
      } catch (error: any) {
        this.logger.error(`Failed to update calendar event for reassigned interview ${interviewId}: ${error?.message ?? error}`);
      }
    }

    try {
      await Promise.all(
        [updated.student.email, updated.interviewer.email].map((to) =>
          this.mailService.sendInterviewScheduled(
            to,
            updated.student.name,
            updated.interviewer.name,
            updated.slot.startTime,
            updated.meetLink ?? '',
            true,
          ),
        ),
      );
    } catch (error: any) {
      this.logger.error(`Failed to send interview updated emails for ${interviewId}: ${error?.message ?? error}`);
    }

    return updated;
  }

  async getInterviewerSessions(interviewerId: string) {
    return this.prisma.interview.findMany({
      where: { interviewerId },
      include: {
        student: {
          select: { id: true, name: true, email: true, profile: true }
        },
        slot: true
      },
      orderBy: { slot: { startTime: 'desc' } }
    });
  }

  async getStudentInterviews(studentId: string) {
    return this.prisma.interview.findMany({
      where: { studentId },
      include: {
        interviewer: {
          select: { id: true, name: true, interviewerProfile: true }
        },
        slot: true
      },
      orderBy: { slot: { startTime: 'desc' } }
    });
  }

  async addFeedback(interviewerId: string, interviewId: string, data: AddFeedbackDto) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview || interview.interviewerId !== interviewerId) {
      throw new ForbiddenException('You are not authorized to provide feedback for this interview');
    }

    return this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        marks: data.marks,
        notes: data.notes,
        status: InterviewStatus.COMPLETED
      }
    });
  }
}
