import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import type { ReactElement } from 'react';
import { CertificateReadyEmail } from './templates/CertificateReadyEmail';
import { ForgotPasswordEmail } from './templates/ForgotPasswordEmail';
import { InterviewScheduledEmail } from './templates/InterviewScheduledEmail';
import { InterviewerWelcomeEmail } from './templates/InterviewerWelcomeEmail';

const RETRY_DELAYS_MS = [1000, 3000, 9000];

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

  async sendMail(to: string, subject: string, html: string, text?: string) {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@lexassess.com';
    const isStream = !this.configService.get<string>('SMTP_HOST');

    let lastError: unknown;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: `"LexAssess" <${from}>`,
          to,
          subject,
          text: text || subject,
          html,
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
        const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
        if (isLastAttempt) {
          this.logger.error(`Failed to send email to ${to} after ${attempt + 1} attempt(s)`, error as Error);
          break;
        }
        const delay = RETRY_DELAYS_MS[attempt];
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
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(startTime);

    const subject = `Interview Scheduled: ${interviewerName} & ${userName}`;
    const { html, text } = await this.renderEmail(InterviewScheduledEmail({ userName, interviewerName, formattedDate, meetLink }));

    return this.sendMail(to, subject, html, text);
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
}
