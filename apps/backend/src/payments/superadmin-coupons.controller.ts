import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { CouponsService } from './coupons.service';
import type { CouponInput } from './coupons.service';

@Controller('superadmin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  list() {
    return this.couponsService.list();
  }

  @Post()
  create(@Body() body: CouponInput) {
    return this.couponsService.create(body ?? {});
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: CouponInput) {
    return this.couponsService.update(id, body ?? {});
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
