import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN, Role.ADMIN)
export class AdminNotificationsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  listAll() {
    return this.authService.listAllNotifications();
  }

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.authService.createNotification(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
    return this.authService.updateNotification(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.deleteNotification(id);
  }
}
