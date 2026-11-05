import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CouponsService } from './coupons.service';
import { SuperadminCouponsController } from './superadmin-coupons.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';
import { PricingController, SuperadminPricingController } from './pricing.controller';

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, CouponsService, PricingService, PrismaService],
  controllers: [PaymentsController, SuperadminCouponsController, PricingController, SuperadminPricingController],
  exports: [PaymentsService, PricingService],
})
export class PaymentsModule {}
