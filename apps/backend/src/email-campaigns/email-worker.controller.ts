import { Controller, ForbiddenException, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { EmailCampaignsService } from './email-campaigns.service';
import { InterviewService } from '../interview/interview.service';

// Called every minute by Cloud Scheduler so queued campaigns keep sending with no one logged in,
// and interviews booked during a Google Calendar outage get their Meet link and emails.
@Controller('internal/email')
@SkipThrottle()
export class EmailWorkerController {
  constructor(
    private readonly campaigns: EmailCampaignsService,
    private readonly interviews: InterviewService,
    private readonly config: ConfigService,
  ) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  async process(@Headers('x-worker-secret') provided?: string) {
    const expected = this.config.get<string>('EMAIL_WORKER_SECRET');
    const a = Buffer.from(provided ?? '');
    const b = Buffer.from(expected ?? '');
    // An unset secret disables the endpoint rather than leaving it open
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new ForbiddenException();
    const interviewSync = await this.interviews.syncPendingInterviews().catch((error: Error) => ({ error: error.message }));
    const campaigns = await this.campaigns.processBatch();
    return { ...campaigns, interviewSync };
  }
}
