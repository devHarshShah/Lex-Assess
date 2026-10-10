import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { SettingsService } from './settings.service';

// Public: the frontend checks this on load to decide whether to show the maintenance screen
@Controller('maintenance')
@SkipThrottle()
export class MaintenanceController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async status() {
    const { enabled, message } = await this.settings.getMaintenance();
    return { enabled, message };
  }
}

@Controller('superadmin/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminMaintenanceController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.getMaintenance();
  }

  @Put()
  update(@Body() dto: UpdateMaintenanceDto) {
    return this.settings.setMaintenance(dto);
  }
}
