import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './roles';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('superadmin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class SuperadminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  listUsers() {
    return this.authService.listUsersForSuperadmin();
  }

  @Patch(':id')
  async updateUser(
    @Req() req: { user: { sub: string } },
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.authService.updateUserForSuperadmin(req.user.sub, userId, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Delete(':id')
  async deleteUser(@Req() req: { user: { sub: string } }, @Param('id') userId: string) {
    const user = await this.authService.deleteUserForSuperadmin(req.user.sub, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted', user };
  }
}
