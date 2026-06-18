import { Controller, Post, Get, Headers, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('subscription')
  async createSubscription(@Request() req: any) {
    return this.paymentsService.createSubscription(req.user.id);
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
    @Body() payload: any,
  ) {
    if (!signature) {
      return { status: 'ignored' };
    }
    await this.paymentsService.verifyWebhook(signature, payload);
    return { status: 'ok' };
  }
}

