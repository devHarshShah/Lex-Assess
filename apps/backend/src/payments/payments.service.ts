import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;
  private planId: string;
  private readonly webhookSecret: string;
  private readonly keyId: string;
  private readonly keySecret: string;
  private planInitializationPromise: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.keyId = this.configService.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET');

    this.planId = this.configService.get<string>('RAZORPAY_PLAN_ID') || '';
    this.webhookSecret = this.configService.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
    
    this.planInitializationPromise = this.initializePlan();
  }

  // Helper to ensure we have a plan for "1999 every 4 months"
  private async initializePlan() {
    if (this.planId && !this.planId.includes('your_razorpay_plan_id')) return;
    
    this.logger.log('No valid Razorpay Plan ID found. Attempting to create one dynamically...');
    try {
      // Try to find if we already created a plan or we can just create one dynamically for test
      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: 4,
        item: {
          name: 'Lex-Assess 4-Month Subscription',
          amount: 199900, // Amount in paise (1999 * 100)
          currency: 'INR',
          description: 'Unlock all tests on Lex-Assess'
        },
        notes: {
          purpose: 'Lex-Assess Subscription'
        }
      });
      // @ts-ignore
      this.planId = plan.id;
      this.logger.log(`Created Razorpay Plan dynamically: ${this.planId}`);
    } catch (error: any) {
      this.logger.error('Failed to initialize Razorpay plan', error?.response || error);
    }
  }

  async createSubscription(userId: string) {
    await this.planInitializationPromise;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) throw new BadRequestException('User not found');
    
    // If they already have an active subscription, just return
    if (user.hasActiveSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    let customerId = user.razorpayCustomerId;

    if (!customerId) {
      try {
        const customer = await this.razorpay.customers.create({
          name: user.name,
          email: user.email,
          contact: user.profile?.mobileNumber || undefined,
        });
        customerId = customer.id;
        
        await this.prisma.user.update({
          where: { id: userId },
          data: { razorpayCustomerId: customerId }
        });
      } catch (error) {
        this.logger.error('Failed to create Razorpay customer', error);
        throw new InternalServerErrorException('Payment gateway error');
      }
    }

    try {
      this.logger.log(`Creating subscription for user ${user.id} with planId: "${this.planId}" and customerId: "${customerId}"`);
      if (!this.planId) {
        throw new BadRequestException('Razorpay Plan ID is not initialized. Please check backend logs for initialization errors.');
      }
      
      const subscriptionParams: any = {
        plan_id: this.planId,
        total_count: 60, // 60 cycles of 4 months = 20 years
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId: user.id
        }
      };

      // Only add customer_id if we have one and it looks valid
      if (customerId) {
        subscriptionParams.customer_id = customerId;
      }

      const subscription = await this.razorpay.subscriptions.create(subscriptionParams);

      await this.prisma.user.update({
        where: { id: userId },
        data: { razorpaySubscriptionId: subscription.id }
      });

      return {
        subscriptionId: subscription.id,
        keyId: this.keyId,
      };
    } catch (error: any) {
      this.logger.error('Failed to create Razorpay subscription', error?.response || error);
      
      // If the error is about an invalid ID, it might be a stale customerId in our DB
      const errorMsg = error?.description || error?.error?.description || '';
      if (errorMsg.includes('ID provided is invalid') || error.statusCode === 400) {
        this.logger.warn(`Potential stale Razorpay ID detected for user ${userId}. Clearing razorpayCustomerId and razorpaySubscriptionId.`);
        await this.prisma.user.update({
          where: { id: userId },
          data: { 
            razorpayCustomerId: null,
            razorpaySubscriptionId: null
          }
        });
      }
      
      throw new InternalServerErrorException(error?.description || 'Failed to create subscription');
    }
  }

  async verifyWebhook(signature: string, rawBody: Buffer, eventId?: string) {
    // Razorpay signs the exact bytes of the request body. We must HMAC the raw
    // buffer, not a re-stringified parse of it (JSON.stringify is not guaranteed
    // to reproduce the original bytes).
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature ?? '', 'utf8');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new BadRequestException('Invalid signature');
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Idempotency: Razorpay retries deliveries with the same x-razorpay-event-id.
    // Record the id first; if it already exists, this is a replay — skip processing.
    if (eventId) {
      try {
        await this.prisma.webhookEvent.create({
          data: { eventId, event: payload.event ?? 'unknown' },
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          this.logger.log(`Webhook ${eventId} already processed; skipping replay`);
          return;
        }
        throw error;
      }
    }

    const event = payload.event;
    if (event === 'subscription.charged' || event === 'subscription.activated') {
      const subscription = payload.payload.subscription.entity;
      const payment = payload.payload.payment?.entity;
      const subscriptionId = subscription.id;
      
      const user = await this.prisma.user.findUnique({
        where: { razorpaySubscriptionId: subscriptionId }
      });

      if (user) {
        // Update user subscription status
        await this.prisma.user.update({
          where: { id: user.id },
          data: { hasActiveSubscription: true }
        });

        // Record the transaction
        if (payment) {
          await this.prisma.transaction.upsert({
            where: { razorpayPaymentId: payment.id },
            update: {
              status: payment.status,
            },
            create: {
              userId: user.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id,
              razorpaySubscriptionId: subscriptionId,
              description: payment.description || 'Lex-Assess Subscription Payment',
            }
          });
        }
        
        this.logger.log(`Activated/Updated subscription for user ${user.id}`);
      }
    } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const subscriptionId = payload.payload.subscription.entity.id;
      
      const user = await this.prisma.user.findUnique({
        where: { razorpaySubscriptionId: subscriptionId }
      });

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { hasActiveSubscription: false }
        });
        this.logger.log(`Deactivated subscription for user ${user.id}`);
      }
    }
  }

  async verifyPayment(userId: string, data: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = data;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (!user.razorpaySubscriptionId || user.razorpaySubscriptionId !== razorpay_subscription_id) {
      throw new BadRequestException('Subscription does not belong to this user');
    }

    // Razorpay signature for subscriptions: HMAC_SHA256(payment_id + '|' + subscription_id, key_secret)
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      throw new BadRequestException('Payment signature verification failed');
    }

    // Defense in depth: confirm with Razorpay that the subscription is actually active
    // before trusting the client-supplied callback.
    let subscription: any;
    try {
      subscription = await this.razorpay.subscriptions.fetch(razorpay_subscription_id);
    } catch (error) {
      this.logger.error('Failed to fetch subscription status from Razorpay', error);
      throw new BadRequestException('Unable to verify subscription status');
    }

    const activeStatuses = ['active', 'authenticated', 'charged'];
    if (!activeStatuses.includes(subscription?.status)) {
      throw new BadRequestException('Subscription is not active');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasActiveSubscription: true,
        razorpaySubscriptionId: razorpay_subscription_id,
      },
    });

    this.logger.log(`Subscription activated for user ${userId} via payment verification`);
    return { success: true };
  }

  async getBillingHistory(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
