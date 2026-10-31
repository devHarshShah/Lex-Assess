import { Controller, Get, Post, Body, UseGuards, Query, Param, Request, Delete } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { CreateInterviewerDto, CreateSlotDto, ScheduleInterviewDto, AddFeedbackDto, BulkCreateSlotsDto, ScheduleCompanyInterviewDto, CompleteCompanyInterviewDto, ReassignInterviewDto } from './dto/interview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles';

@Controller('interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  // ADMIN: Manage interviewers
  @Post('interviewers')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createInterviewer(@Body() data: CreateInterviewerDto) {
    return this.interviewService.createInterviewer(data);
  }

  @Get('interviewers')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getAllInterviewers() {
    return this.interviewService.getAllInterviewers();
  }

  @Delete('interviewers/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  deleteInterviewer(@Param('id') id: string) {
    return this.interviewService.deleteInterviewer(id);
  }

  @Post('interviewers/:id/resend-welcome')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  resendInterviewerWelcome(@Param('id') id: string) {
    return this.interviewService.resendInterviewerWelcome(id);
  }

  // ADMIN: Manage slots
  @Post('slots')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  addSlot(@Body() data: CreateSlotDto) {
    return this.interviewService.addSlot(data);
  }

  // INTERVIEWER: Manage my slots
  @Get('my-slots')
  @Roles(Role.INTERVIEWER)
  getMySlots(@Request() req: any) {
    return this.interviewService.getInterviewerSlots(req.user.id);
  }

  @Post('my-slots')
  @Roles(Role.INTERVIEWER)
  addMySlot(@Request() req: any, @Body() data: Omit<CreateSlotDto, 'interviewerId'>) {
    return this.interviewService.addSlot({ ...data, interviewerId: req.user.id });
  }

  @Post('my-slots/bulk')
  @Roles(Role.INTERVIEWER)
  bulkAddMySlots(@Request() req: any, @Body() data: BulkCreateSlotsDto) {
    return this.interviewService.bulkAddSlots(req.user.id, data);
  }

  @Post('slots/bulk/:interviewerId')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  adminBulkAddSlots(@Param('interviewerId') interviewerId: string, @Body() data: BulkCreateSlotsDto) {
    return this.interviewService.bulkAddSlots(interviewerId, data);
  }

  @Delete('slots/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.INTERVIEWER)
  deleteSlot(@Request() req: any, @Param('id') id: string) {
    return this.interviewService.deleteSlot(req.user.id, req.user.role, id);
  }

  // STUDENT: Schedule
  @Get('available-slots')
  @Roles(Role.USER)
  getAvailableSlots(@Query('specialization') specialization?: string) {
    return this.interviewService.getAvailableSlots(specialization);
  }

  @Get('can-schedule')
  @Roles(Role.USER)
  canSchedule(@Request() req: any) {
    return this.interviewService.canStudentSchedule(req.user.id);
  }

  @Post('schedule')
  @Roles(Role.USER)
  scheduleInterview(@Request() req: any, @Body() data: ScheduleInterviewDto) {
    return this.interviewService.scheduleInterview(req.user.id, data);
  }

  // COMPANY: Own hiring-stage interview, separate from the LexAssess interview
  @Post('company-schedule/:attemptId')
  @Roles(Role.COMPANY)
  companyScheduleInterview(
    @Request() req: any,
    @Param('attemptId') attemptId: string,
    @Body() data: ScheduleCompanyInterviewDto,
  ) {
    return this.interviewService.scheduleCompanyInterview(req.user.id, attemptId, data);
  }

  @Get('company-interviews')
  @Roles(Role.COMPANY)
  getCompanyInterviews(@Request() req: any) {
    return this.interviewService.getCompanyInterviews(req.user.id);
  }

  @Post('company-interviews/:id/complete')
  @Roles(Role.COMPANY)
  completeCompanyInterview(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: CompleteCompanyInterviewDto,
  ) {
    return this.interviewService.completeCompanyInterview(req.user.id, id, data);
  }

  @Get('my-interviews')
  @Roles(Role.USER)
  getStudentInterviews(@Request() req: any) {
    return this.interviewService.getStudentInterviews(req.user.id);
  }

  // ADMIN: Upcoming booked interviews, and moving one to another interviewer
  @Get('scheduled')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getScheduledInterviews() {
    return this.interviewService.getScheduledInterviews();
  }

  @Post(':id/reassign')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  reassignInterview(@Param('id') id: string, @Body() data: ReassignInterviewDto) {
    return this.interviewService.reassignInterview(id, data);
  }

  // INTERVIEWER: My sessions
  @Get('sessions')
  @Roles(Role.INTERVIEWER)
  getInterviewerSessions(@Request() req: any) {
    return this.interviewService.getInterviewerSessions(req.user.id);
  }

  @Post(':id/feedback')
  @Roles(Role.INTERVIEWER)
  addFeedback(@Request() req: any, @Param('id') id: string, @Body() data: AddFeedbackDto) {
    return this.interviewService.addFeedback(req.user.id, id, data);
  }
}
