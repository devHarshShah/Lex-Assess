import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { setAuthCookie, clearAuthCookie } from './auth-cookie';
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
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registerWithEmailPassword({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });
    setAuthCookie(res, this.configService, result.accessToken);
    // Token is delivered via the httpOnly cookie only; never in the body.
    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Post('assign-admin')
  assignAdmin(@Body() dto: AssignAdminDto) {
    return this.authService.assignAdmin(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithEmailPassword(dto.email, dto.password);
    setAuthCookie(res, this.configService, result.accessToken);
    return { user: result.user };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto) {
    return this.authService.setPasswordViaToken(dto.token, dto.password);
  }

  @Post('google/exchange')
  async googleExchange(@Body() dto: GoogleCodeExchangeDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithGoogleCode(dto.code, dto.state);
    setAuthCookie(res, this.configService, result.accessToken);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res, this.configService);
    return { success: true };
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
