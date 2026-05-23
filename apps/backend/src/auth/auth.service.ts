import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: 'true' | 'false';
  name?: string;
}

interface GoogleTokenExchangeResponse {
  id_token?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async registerWithEmailPassword(input: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }): Promise<AuthResponseDto> {
    const existingUser = await this.usersService.findByEmail(input.email);
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const role = input.role ?? Role.USER;
    if (role !== Role.USER && role !== Role.COMPANY) {
      throw new BadRequestException('Invalid role for self registration');
    }

    const passwordHash = await hash(input.password, 10);

    const user = await this.usersService.createEmailUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role,
    });

    return this.issueToken(user.id, user.email, user.role, user.name);
  }

  async assignAdmin(email: string) {
    const user = await this.usersService.updateRoleByEmail(email, Role.ADMIN);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'Admin role assigned',
      user: this.usersService.toPublicUser(user),
    };
  }

  async loginWithEmailPassword(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');

    const isValidPassword = await compare(password, user.passwordHash);
    if (!isValidPassword) throw new UnauthorizedException('Invalid email or password');

    return this.issueToken(user.id, user.email, user.role, user.name);
  }

  async loginWithGoogleCode(code: string): Promise<AuthResponseDto> {
    const idToken = await this.exchangeGoogleCodeForIdToken(code);
    const tokenInfo = await this.verifyGoogleIdToken(idToken);
    return this.loginWithGoogleTokenInfo(tokenInfo);
  }

  async me(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return this.usersService.toPublicUser(user);
  }

  buildGoogleStartUrl(state?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = this.googleRedirectUri;

    if (!clientId) {
      throw new UnauthorizedException('GOOGLE_CLIENT_ID is not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.set('state', state);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private get googleRedirectUri(): string {
    return process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/auth/google/callback';
  }

  private get googleClientId(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new UnauthorizedException('GOOGLE_CLIENT_ID is not configured');
    }

    return clientId;
  }

  private get googleClientSecret(): string {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      throw new UnauthorizedException('GOOGLE_CLIENT_SECRET is not configured');
    }

    return clientSecret;
  }

  private async exchangeGoogleCodeForIdToken(code: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: this.googleRedirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to exchange Google OAuth code');
    }

    const payload = (await response.json()) as GoogleTokenExchangeResponse;

    if (!payload.id_token) {
      throw new UnauthorizedException('Google OAuth response missing ID token');
    }

    return payload.id_token;
  }

  private async loginWithGoogleTokenInfo(tokenInfo: GoogleTokenInfo): Promise<AuthResponseDto> {
    if (tokenInfo.email_verified !== 'true') {
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.usersService.upsertGoogleUser({
      email: tokenInfo.email,
      name: tokenInfo.name,
      googleId: tokenInfo.sub,
    });

    return this.issueToken(user.id, user.email, user.role, user.name);
  }

  private issueToken(id: string, email: string, role: Role, name: string): AuthResponseDto {
    const accessToken = this.jwtService.sign({
      sub: id,
      email,
      role,
    });

    return {
      accessToken,
      user: {
        id,
        email,
        role,
        name,
      },
    };
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const tokenInfo = (await response.json()) as Partial<GoogleTokenInfo> & { aud?: string };

    if (!tokenInfo.sub || !tokenInfo.email || !tokenInfo.email_verified) {
      throw new UnauthorizedException('Google token payload is incomplete');
    }

    if (tokenInfo.aud !== this.googleClientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    return tokenInfo as GoogleTokenInfo;
  }
}
