import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { verifyUnsubscribeToken } from './unsubscribe-token';

const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
};

// Public: students reach these from the link in a campaign email, signed in or not.
@Controller('email')
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class UnsubscribeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async userFromToken(token?: string) {
    const userId = verifyUnsubscribeToken(token ?? '', this.config.getOrThrow<string>('JWT_SECRET'));
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, marketingUnsubscribedAt: true } }) : null;
    if (!user) throw new BadRequestException('This link is not valid');
    return user;
  }

  @Get('preferences')
  async preferences(@Query('token') token?: string) {
    const user = await this.userFromToken(token);
    return { email: maskEmail(user.email), unsubscribed: !!user.marketingUnsubscribedAt };
  }

  // Also the RFC 8058 one-click endpoint: mail clients POST here with the token in the query string
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Query('token') queryToken?: string, @Body() body?: { token?: string }) {
    const user = await this.userFromToken(queryToken ?? body?.token);
    if (!user.marketingUnsubscribedAt) {
      await this.prisma.user.update({ where: { id: user.id }, data: { marketingUnsubscribedAt: new Date() } });
    }
    return { email: maskEmail(user.email), unsubscribed: true };
  }

  @Post('resubscribe')
  @HttpCode(HttpStatus.OK)
  async resubscribe(@Body() body?: { token?: string }) {
    const user = await this.userFromToken(body?.token);
    await this.prisma.user.update({ where: { id: user.id }, data: { marketingUnsubscribedAt: null } });
    return { email: maskEmail(user.email), unsubscribed: false };
  }
}
