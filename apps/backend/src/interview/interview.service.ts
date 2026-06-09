import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { GoogleCalendarService } from '../mail/google-calendar.service';
import { Role, InterviewStatus, AttemptStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateInterviewerDto, CreateSlotDto, ScheduleInterviewDto, AddFeedbackDto, BulkCreateSlotsDto } from './dto/interview.dto';

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

    let currentDay = new Date(start);
    while (currentDay <= end) {
      if (data.daysOfWeek.includes(currentDay.getDay())) {
        const dayStartTime = new Date(currentDay);
        dayStartTime.setHours(startHour, startMin, 0, 0);
        
        const dayEndTime = new Date(currentDay);
        dayEndTime.setHours(endHour, endMin, 0, 0);

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

    if (slots.length === 0) return { count: 0 };

    return this.prisma.interviewSlot.createMany({
      data: slots,
      skipDuplicates: true,
    });
  }

  async createInterviewer(data: CreateInterviewerDto) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('User with this email already exists');

    // Create user with INTERVIEWER role and a default password
    const defaultPassword = 'Interviewer@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: Role.INTERVIEWER,
        passwordHash,
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
      await this.mailService.sendInterviewerWelcome(data.email, data.name, defaultPassword);
    } catch (error) {
      // Don't fail the whole request if email fails, but log it
      console.error('Failed to send welcome email to interviewer:', error);
    }

    return user;
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

    // Mark slot as booked and create interview
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.interviewSlot.update({
        where: { id: slot.id },
        data: { isBooked: true }
      });

      const student = await tx.user.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundException('Student not found');

      try {
        const event = await this.calendarService.createInterviewEvent({
          studentName: student.name,
          studentEmail: student.email,
          interviewerName: slot.interviewer.name,
          interviewerEmail: slot.interviewer.email,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });

        const interview = await tx.interview.create({
          data: {
            studentId,
            interviewerId: slot.interviewerId,
            slotId: slot.id,
            status: InterviewStatus.SCHEDULED,
            meetLink: event.meetLink,
            googleEventId: event.eventId,
          },
          include: { 
            interviewer: true, 
            student: true,
            slot: true 
          }
        });

        return interview;
      } catch (error: any) {
        this.logger.error('Failed to schedule interview due to calendar error:', error);
        throw new BadRequestException(`Failed to schedule interview: ${error.message || 'Google Calendar error'}`);
      }
    });

    // Send emails
    try {
      if (result.student && result.interviewer && result.slot) {
        await Promise.all([
          this.mailService.sendInterviewScheduled(
            result.student.email,
            result.student.name,
            result.interviewer.name,
            result.slot.startTime,
            result.meetLink!
          ),
          this.mailService.sendInterviewScheduled(
            result.interviewer.email,
            result.student.name,
            result.interviewer.name,
            result.slot.startTime,
            result.meetLink!
          )
        ]);
      }
    } catch (error) {
      console.error('Failed to send interview scheduled emails:', error);
    }

    return result;
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
