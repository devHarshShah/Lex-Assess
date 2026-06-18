import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

  async sendMail(to: string, subject: string, html: string, text?: string) {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@lexassess.com';
    const isStream = !this.configService.get<string>('SMTP_HOST');
    
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
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendInterviewerWelcome(email: string, name: string, setupToken: string) {
    const subject = 'Welcome to LexAssess - Set Up Your Interviewer Account';
    const setPasswordUrl = `${this.configService.get('FRONTEND_ORIGIN')}/set-password?token=${setupToken}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #d97706;">Welcome to LexAssess, ${name}!</h2>
        <p>You have been registered as an interviewer on the LexAssess platform.</p>
        <p>Your account email is <strong>${email}</strong>. To get started, set your password using the link below.</p>

        <a href="${setPasswordUrl}"
           style="display: inline-block; background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Set Your Password
        </a>

        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          This link expires in 24 hours. If you did not expect this email, please ignore it.
        </p>
      </div>
    `;

    return this.sendMail(email, subject, html);
  }

  async sendInterviewScheduled(to: string, userName: string, interviewerName: string, startTime: Date, meetLink: string) {
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }).format(startTime);

    const subject = `Interview Scheduled: ${interviewerName} & ${userName}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #d97706;">Interview Confirmed</h2>
        <p>Hello,</p>
        <p>An interview has been successfully scheduled.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Student:</strong> ${userName}</p>
          <p style="margin: 5px 0;"><strong>Interviewer:</strong> ${interviewerName}</p>
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${formattedDate} (IST)</p>
        </div>

        <p>You can join the interview via Google Meet using the link below:</p>
        
        <a href="${meetLink}" 
           style="display: inline-block; background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Join Google Meet
        </a>

        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          Please ensure you join at least 5 minutes early.
        </p>
      </div>
    `;

    return this.sendMail(to, subject, html);
  }
}
