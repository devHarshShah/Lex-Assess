import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { GoogleCodeExchangeDto } from './dto/google-code-exchange.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from './roles';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.registerWithEmailPassword({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Post('assign-admin')
  assignAdmin(@Body() dto: AssignAdminDto) {
    return this.authService.assignAdmin(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithEmailPassword(dto.email, dto.password);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPasswordViaToken(dto.token, dto.password);
  }

  @Post('google/exchange')
  googleExchange(@Body() dto: GoogleCodeExchangeDto) {
    return this.authService.loginWithGoogleCode(dto.code, dto.state);
  }

  @Get('google/start')
  googleStart(@Res() res: Response, @Query('role') role?: string) {
    const googleUrl = this.authService.buildGoogleStartUrl(role);
    return res.redirect(googleUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { sub: string } }) {
    return this.authService.me(req.user.sub);
  }
}
