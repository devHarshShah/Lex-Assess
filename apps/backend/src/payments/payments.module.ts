import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CouponsService } from './coupons.service';
import { SuperadminCouponsController } from './superadmin-coupons.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [PaymentsService, CouponsService, PrismaService],
  controllers: [PaymentsController, SuperadminCouponsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
