import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import type { ReactElement } from 'react';
import { CertificateReadyEmail } from './templates/CertificateReadyEmail';
import { CompanyInterviewEmail, companyInterviewSubject, type CompanyInterviewEmailProps } from './templates/CompanyInterviewEmail';
import { ForgotPasswordEmail } from './templates/ForgotPasswordEmail';
import { InterviewScheduledEmail } from './templates/InterviewScheduledEmail';
import { InterviewerWelcomeEmail } from './templates/InterviewerWelcomeEmail';

const RETRY_DELAYS_MS = [1000, 3000, 9000];
// Superadmin test sends always go to this address, not the admin's own inbox.
export const TEST_EMAIL_RECIPIENT = 'harshdipashah@gmail.com';

export const formatIstDateTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(d);

export interface SendMailOptions {
  headers?: Record<string, string>;
  replyTo?: string;
  retryDelaysMs?: number[];
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<boolean>('SMTP_SECURE') ?? false;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.logger.log(`Mail service initialized with host: ${host}`);
    } else {
      this.logger.warn('Mail service not fully configured. Emails will be logged to console instead.');
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }
  }

  private async renderEmail(element: ReactElement): Promise<{ html: string; text: string }> {
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    return { html, text };
  }

  async sendMail(to: string, subject: string, html: string, text?: string, options: SendMailOptions = {}) {
    const retryDelays = options.retryDelaysMs ?? RETRY_DELAYS_MS;
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@lexassess.com';
    const isStream = !this.configService.get<string>('SMTP_HOST');

    let lastError: unknown;
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: `"LexAssess" <${from}>`,
          to,
          subject,
          text: text || subject,
          html,
          ...(options.headers ? { headers: options.headers } : {}),
          ...(options.replyTo ? { replyTo: options.replyTo } : {}),
        });

        if (isStream) {
          this.logger.debug('SMTP not configured. Email logged to console (stream):');
          this.logger.debug(info.message.toString());
        } else {
          this.logger.log(`Email sent successfully to ${to}. MessageID: ${info.messageId}`);
        }

        return info;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === retryDelays.length;
        if (isLastAttempt) {
          this.logger.error(`Failed to send email to ${to} after ${attempt + 1} attempt(s)`, error as Error);
          break;
        }
        const delay = retryDelays[attempt];
        this.logger.warn(`Attempt ${attempt + 1} to send email to ${to} failed, retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  async sendInterviewerWelcome(email: string, name: string, setupToken: string) {
    const subject = 'Welcome to LexAssess - Set Up Your Interviewer Account';
    const setPasswordUrl = `${this.configService.get('FRONTEND_ORIGIN')}/set-password?token=${setupToken}`;
    const { html, text } = await this.renderEmail(InterviewerWelcomeEmail({ name, email, setPasswordUrl }));

    return this.sendMail(email, subject, html, text);
  }

  async sendInterviewScheduled(to: string, userName: string, interviewerName: string, startTime: Date, meetLink: string) {
    const formattedDate = formatIstDateTime(startTime);

    const subject = `Interview Scheduled: ${interviewerName} & ${userName}`;
    const { html, text } = await this.renderEmail(InterviewScheduledEmail({ userName, interviewerName, formattedDate, meetLink }));

    return this.sendMail(to, subject, html, text);
  }

  // Rendered separately from sending so the superadmin preview is byte-for-byte what gets sent.
  async renderCompanyInterview(props: CompanyInterviewEmailProps) {
    const { html, text } = await this.renderEmail(CompanyInterviewEmail(props));
    return { subject: companyInterviewSubject(props), html, text };
  }

  async sendCompanyInterview(to: string, mail: { subject: string; html: string; text: string }) {
    return this.sendMail(to, mail.subject, mail.html, mail.text, {
      replyTo: this.configService.get<string>('EMAIL_REPLY_TO') || undefined,
    });
  }

  async sendForgotPassword(email: string, name: string, resetToken: string) {
    const subject = 'Reset Your LexAssess Password';
    const resetUrl = `${this.configService.get('FRONTEND_ORIGIN')}/set-password?token=${resetToken}`;
    const { html, text } = await this.renderEmail(ForgotPasswordEmail({ name, resetUrl }));

    return this.sendMail(email, subject, html, text);
  }

  async sendCertificateReady(email: string, name: string, rollNumber: string, practiceArea: string) {
    const subject = 'Your LexAssess Certificate Is Ready';
    const certificateUrl = `${this.configService.get('FRONTEND_ORIGIN')}/certificate`;
    const { html, text } = await this.renderEmail(CertificateReadyEmail({ name, rollNumber, practiceArea, certificateUrl }));

    return this.sendMail(email, subject, html, text);
  }

  // Bulk/marketing mail: one quick retry (the campaign worker does its own retrying) and the
  // headers mail clients use to show an "Unsubscribe" button.
  async sendCampaignMail(to: string, mail: { subject: string; html: string; text: string }, unsubscribe: { url: string; oneClickUrl?: string }) {
    const headers: Record<string, string> = {
      'List-Unsubscribe': `<${unsubscribe.oneClickUrl ?? unsubscribe.url}>`,
      Precedence: 'bulk',
    };
    if (unsubscribe.oneClickUrl) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    return this.sendMail(to, mail.subject, mail.html, mail.text, {
      headers,
      replyTo: this.configService.get<string>('EMAIL_REPLY_TO') || undefined,
      retryDelaysMs: [1000],
    });
  }
}
