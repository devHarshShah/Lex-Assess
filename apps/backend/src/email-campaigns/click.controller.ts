import { Controller, Get, Header, Headers, Param, Redirect, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { buildTargetUrl, isBotUserAgent, MIN_HUMAN_DELAY_MS, verifyClickToken } from './click-token';

// Public: the tracked links inside campaign mails land here, then bounce to the real page.
@Controller('email')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class ClickController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get origin(): string {
    const first = (this.config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173').split(',')[0]!.trim();
    return first.replace(/\/$/, '');
  }

  @Get('click/:token')
  @Header('Cache-Control', 'no-store')
  @Redirect()
  async click(@Param('token') token: string, @Req() req: Request, @Headers('user-agent') userAgent?: string) {
    const parsed = verifyClickToken(token, this.config.getOrThrow<string>('JWT_SECRET'));
    // A bad token still sends the student somewhere useful rather than showing an error
    if (!parsed) return { url: `${this.origin}/dashboard`, statusCode: 302 };

    const recipient = await this.prisma.emailCampaignRecipient.findUnique({
      where: { id: parsed.recipientId },
      select: { id: true, userId: true, campaignId: true, sentAt: true, campaign: { select: { templateKey: true } } },
    });
    if (!recipient) return { url: `${this.origin}/dashboard`, statusCode: 302 };

    const tooSoon = !recipient.sentAt || Date.now() - recipient.sentAt.getTime() < MIN_HUMAN_DELAY_MS;
    // HEAD is how link scanners probe a URL; only a real GET is a click
    if (req.method === 'GET' && !isBotUserAgent(userAgent) && !tooSoon) {
      const now = new Date();
      await this.prisma
        .$transaction([
          this.prisma.emailLinkClick.create({
            data: { campaignId: recipient.campaignId, recipientId: recipient.id, userId: recipient.userId, linkKey: parsed.linkKey, clickedAt: now },
          }),
          this.prisma.emailCampaignRecipient.updateMany({ where: { id: recipient.id, firstClickedAt: null }, data: { firstClickedAt: now } }),
          this.prisma.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { clickCount: { increment: 1 } } }),
        ])
        .catch(() => undefined); // never block the redirect on a tracking failure
    }
    return { url: buildTargetUrl(this.origin, parsed.linkKey, recipient.campaignId, recipient.campaign.templateKey), statusCode: 302 };
  }
}
