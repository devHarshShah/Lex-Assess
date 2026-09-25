import { BadRequestException, Controller, Post, Get, Headers, Body, UseGuards, Request, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('subscription')
  async createSubscription(@Request() req: any, @Body() body: { termsVersion?: string }) {
    const termsVersion = typeof body?.termsVersion === 'string' ? body.termsVersion.trim() : '';
    if (!termsVersion || termsVersion.length > 32) {
      throw new BadRequestException('You must accept the Terms of Use to continue');
    }
    return this.paymentsService.createSubscription(req.user.id, termsVersion);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-payment')
  async verifyPayment(
    @Request() req: any,
    @Body() body: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    },
  ) {
    return this.paymentsService.verifyPayment(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getBillingHistory(@Request() req: any) {
    return this.paymentsService.getBillingHistory(req.user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Headers('x-razorpay-event-id') eventId: string,
    @Req() req: RawBodyRequest<ExpressRequest>,
  ) {
    if (!signature || !req.rawBody) {
      return { status: 'ignored' };
    }
    await this.paymentsService.verifyWebhook(signature, req.rawBody, eventId);
    return { status: 'ok' };
  }
}

