import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  listPublic() {
    return this.authService.listPublicNotifications();
  }
}
