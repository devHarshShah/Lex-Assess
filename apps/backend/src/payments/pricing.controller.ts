import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { PricingService } from './pricing.service';

// Public: every price shown in the app comes from here (no Razorpay plan ids)
@Controller('pricing')
@SkipThrottle()
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  get() {
    return this.pricing.getPublicPricing();
  }
}

@Controller('superadmin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  get() {
    return this.pricing.getPricing();
  }

  @Put()
  update(@Body() dto: UpdatePricingDto) {
    if (dto.compareAtPaise != null && dto.compareAtPaise <= dto.amountPaise) {
      throw new BadRequestException('The strike-through price must be higher than the actual price');
    }
    return this.pricing.updatePricing(dto);
  }
}
