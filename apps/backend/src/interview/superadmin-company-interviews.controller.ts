import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { CompanyInterviewAdminService } from './company-interview-admin.service';
import type { CompanyInterviewListQuery, InterviewInviteInput } from './company-interview-admin.service';

@Controller('superadmin/company-interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminCompanyInterviewsController {
  constructor(private readonly interviews: CompanyInterviewAdminService) {}

  @Get()
  list(@Query() q: CompanyInterviewListQuery) {
    return this.interviews.list(q);
  }

  @Get('options/students')
  students(@Query('search') search?: string) {
    return this.interviews.searchStudents(search);
  }

  @Get('options/companies')
  companies(@Query('search') search?: string) {
    return this.interviews.searchCompanies(search);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() body: InterviewInviteInput) {
    return this.interviews.preview(body ?? {});
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('test-send')
  @HttpCode(HttpStatus.OK)
  testSend(@Body() body: InterviewInviteInput) {
    return this.interviews.sendTest(body ?? {});
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  schedule(@Request() req: any, @Body() body: InterviewInviteInput) {
    return this.interviews.schedule(body ?? {}, req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch(':id/reschedule')
  reschedule(@Request() req: any, @Param('id') id: string, @Body() body: InterviewInviteInput) {
    return this.interviews.reschedule(id, body ?? {}, req.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Request() req: any, @Param('id') id: string, @Body() body: InterviewInviteInput) {
    return this.interviews.cancel(id, body ?? {}, req.user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/resend-emails')
  @HttpCode(HttpStatus.OK)
  resend(@Param('id') id: string) {
    return this.interviews.resendEmails(id);
  }
}
