import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from './coupons.service';
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
    private readonly coupons: CouponsService,
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

  // Helper to ensure we have a plan for "499 every 3 months" (new-customer
  // promotional price; only runs when RAZORPAY_PLAN_ID isn't already set to
  // a real plan, which is the case in production, so this is a dev/test path)
  private async initializePlan() {
    if (this.planId && !this.planId.includes('your_razorpay_plan_id')) return;

    this.logger.log('No valid Razorpay Plan ID found. Attempting to create one dynamically...');
    try {
      // Try to find if we already created a plan or we can just create one dynamically for test
      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: 3,
        item: {
          name: 'Lex-Assess 3-Month Subscription',
          amount: 49900, // Amount in paise (499 * 100)
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

  async createSubscription(userId: string, termsVersion: string, couponCode?: string) {
    await this.planInitializationPromise;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) throw new BadRequestException('User not found');

    // Record consent before anything is created at Razorpay, so a payment can't start without it.
    await this.prisma.termsAcceptance.create({ data: { userId, version: termsVersion, context: 'PAYMENT' } });

    // If they already have an active subscription, just return
    if (user.hasActiveSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    // Never silently create a second Razorpay subscription for the same user.
    // hasActiveSubscription alone isn't enough to guard this: a subscription
    // can be genuinely paid and still show false here if the webhook that
    // would have flipped it hasn't landed yet (see verifyWebhook). Check the
    // *live* status of whatever subscription is already linked before
    // creating a new one, so a second click reuses it instead of orphaning
    // the first (which was exactly how a live ₹1 test subscription ended up
    // paid-but-never-linked: a second click clobbered the pointer to it).
    if (user.razorpaySubscriptionId) {
      try {
        const existing = await this.razorpay.subscriptions.fetch(user.razorpaySubscriptionId);
        const deadStatuses = ['cancelled', 'completed', 'expired'];
        if (existing?.status && !deadStatuses.includes(existing.status)) {
          this.logger.log(
            `Reusing existing subscription ${user.razorpaySubscriptionId} for user ${userId} (status: ${existing.status})`,
          );
          return {
            subscriptionId: user.razorpaySubscriptionId,
            keyId: this.keyId,
          };
        }
        // Dead subscription (cancelled/completed/expired) - fall through and create a new one.
      } catch (error) {
        // Stale/invalid id on our side - fall through and create a new one.
        this.logger.warn(`Could not fetch existing subscription ${user.razorpaySubscriptionId} for user ${userId}; creating a new one`, error);
      }
    }

    let customerId = user.razorpayCustomerId;

    if (!customerId) {
      try {
        const customer = await this.razorpay.customers.create({
          name: user.name,
          email: user.email,
          contact: user.profile?.mobileNumber || undefined,
          // Razorpay rejects a duplicate email/contact by default; with '0' it
          // returns the existing customer instead. Needed whenever our DB lost
          // the customer id (see the stale-id reset in the catch below).
          fail_existing: '0',
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

    // Redeem the coupon (if any) only now, after every early-return path, so a
    // reused subscription never consumes a coupon. Undone below on failure.
    let redemptionId: string | null = null;
    let trialEndsAt: Date | null = null;
    if (couponCode) {
      const redeemed = await this.coupons.redeem(userId, couponCode);
      redemptionId = redeemed.redemptionId;
      trialEndsAt = new Date(Date.now() + redeemed.freeDays * 24 * 60 * 60 * 1000);
    }

    try {
      this.logger.log(`Creating subscription for user ${user.id} with planId: "${this.planId}" and customerId: "${customerId}"`);
      if (!this.planId) {
        throw new BadRequestException('Razorpay Plan ID is not initialized. Please check backend logs for initialization errors.');
      }

      const subscriptionParams: any = {
        plan_id: this.planId,
        total_count: 60, // 60 cycles of 3 months = 15 years
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId: user.id
        }
      };

      // Free period: defer the first charge. Access starts once the mandate is authenticated.
      if (trialEndsAt) {
        subscriptionParams.start_at = Math.floor(trialEndsAt.getTime() / 1000);
      }

      // Only add customer_id if we have one and it looks valid
      if (customerId) {
        subscriptionParams.customer_id = customerId;
      }

      const subscription = await this.razorpay.subscriptions.create(subscriptionParams);

      await this.prisma.user.update({
        where: { id: userId },
        data: { razorpaySubscriptionId: subscription.id, trialEndsAt }
      });
      if (redemptionId) {
        await this.coupons.attachSubscription(redemptionId, subscription.id);
      }

      return {
        subscriptionId: subscription.id,
        keyId: this.keyId,
        trialEndsAt,
      };
    } catch (error: any) {
      this.logger.error('Failed to create Razorpay subscription', error?.response || error);

      if (redemptionId) {
        await this.coupons.release(redemptionId).catch((e) =>
          this.logger.error(`Failed to release coupon redemption ${redemptionId}`, e),
        );
      }

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

  // Resolves the user for a subscription webhook event. Prefers notes.userId
  // (set by us on every subscription.create call, and echoed back by Razorpay
  // on every event for that subscription) over matching the user's current
  // razorpaySubscriptionId pointer - that pointer can drift if the user
  // re-subscribed since this specific subscription was created, in which case
  // an equality match would silently find nobody and drop the event.
  private async findUserForSubscriptionEvent(subscriptionEntity: any) {
    const noteUserId = subscriptionEntity?.notes?.userId;
    if (noteUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: noteUserId } });
      if (user) return user;
    }
    // Fallback for subscriptions created before notes.userId existed.
    return this.prisma.user.findUnique({
      where: { razorpaySubscriptionId: subscriptionEntity.id },
    });
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

    // During a coupon free period no charge happens, so Razorpay only sends
    // `authenticated` (mandate approved). Treat that as activation, but only
    // when the first charge is scheduled in the future; otherwise an
    // authenticated-but-uncharged normal subscription would get access.
    const isTrialAuthenticated =
      event === 'subscription.authenticated' &&
      Number(payload.payload?.subscription?.entity?.start_at) * 1000 > Date.now();

    if (event === 'subscription.charged' || event === 'subscription.activated' || isTrialAuthenticated) {
      const subscription = payload.payload.subscription.entity;
      const payment = payload.payload.payment?.entity;
      const subscriptionId = subscription.id;

      const user = await this.findUserForSubscriptionEvent(subscription);

      if (user) {
        // Update user subscription status. Also (re)write razorpaySubscriptionId
        // to this event's subscription id: if the user re-subscribed and this
        // pointer had drifted to a different (unpaid) subscription, this is
        // what makes the link self-healing instead of the update being lost.
        await this.prisma.user.update({
          where: { id: user.id },
          data: { hasActiveSubscription: true, razorpaySubscriptionId: subscriptionId }
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
      } else {
        this.logger.warn(`Webhook ${event} for subscription ${subscriptionId} matched no user (notes.userId="${subscription?.notes?.userId}")`);
      }
    } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const subscription = payload.payload.subscription.entity;
      const subscriptionId = subscription.id;

      const user = await this.findUserForSubscriptionEvent(subscription);

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { hasActiveSubscription: false }
        });
        this.logger.log(`Deactivated subscription for user ${user.id}`);
      } else {
        this.logger.warn(`Webhook ${event} for subscription ${subscriptionId} matched no user (notes.userId="${subscription?.notes?.userId}")`);
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

    // 'charged' is a *payment* status, not a subscription status - Razorpay's
    // subscription statuses are created/authenticated/active/pending/halted/
    // cancelled/completed/expired. A subscription can briefly sit in
    // 'created' or 'pending' even after its first payment has captured, so
    // treat those as "still confirming" rather than a hard failure - the
    // webhook (verifyWebhook) is the authoritative source and will flip
    // hasActiveSubscription once Razorpay finalizes it.
    const confirmedStatuses = ['active', 'authenticated'];
    const pendingStatuses = ['created', 'pending'];

    if (confirmedStatuses.includes(subscription?.status)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          hasActiveSubscription: true,
          razorpaySubscriptionId: razorpay_subscription_id,
        },
      });

      this.logger.log(`Subscription activated for user ${userId} via payment verification`);
      return { success: true, pending: false };
    }

    if (pendingStatuses.includes(subscription?.status)) {
      this.logger.log(
        `Subscription ${razorpay_subscription_id} still "${subscription.status}" for user ${userId} after payment; awaiting webhook confirmation`,
      );
      return { success: true, pending: true };
    }

    throw new BadRequestException('Subscription is not active');
  }

  async getBillingHistory(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
