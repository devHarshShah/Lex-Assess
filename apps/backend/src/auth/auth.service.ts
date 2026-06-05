import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProfileStepOneDto } from './dto/profile-step-one.dto';
import { ProfileVerificationDto } from './dto/profile-verification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified: 'true' | 'false';
  name?: string;
  picture?: string;
}

interface GoogleTokenExchangeResponse {
  id_token?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    return this.issueToken(user.id, user.email, user.role, user.name, user.avatarUrl, false, false);
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

  listUsersForSuperadmin() {
    return this.usersService.listAllUsers();
  }

  async updateUserForSuperadmin(actorUserId: string, userId: string, dto: UpdateUserDto) {
    if (!dto.name && !dto.role) {
      throw new BadRequestException('At least one field is required');
    }

    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      return null;
    }

    if (targetUser.role === Role.SUPERADMIN && actorUserId !== targetUser.id) {
      throw new BadRequestException('Cannot modify another superadmin');
    }

    if (dto.role === Role.SUPERADMIN) {
      throw new BadRequestException('Cannot assign superadmin role from this endpoint');
    }

    return this.usersService.updateUserById(userId, dto);
  }

  async deleteUserForSuperadmin(actorUserId: string, userId: string) {
    const targetUser = await this.usersService.findById(userId);
    if (!targetUser) {
      return null;
    }

    if (actorUserId === targetUser.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    if (targetUser.role === Role.SUPERADMIN) {
      throw new BadRequestException('Cannot delete a superadmin account');
    }

    return this.usersService.deleteUserById(userId);
  }

  async getProfile(userId: string) {
    return this.usersService.getProfile(userId);
  }

  async getProfileOptions() {
    const [colleges, degrees, specializations] = await Promise.all([
      this.usersService.listColleges(),
      this.usersService.listDegrees(),
      this.usersService.listActiveSpecializations(),
    ]);

    return {
      colleges: colleges.map((c) => c.name),
      degrees: degrees.map((d) => d.name),
      specializations: specializations.map((s) => s.name),
    };
  }

  async getProfileCompletionStatus(userId: string) {
    const profile = await this.usersService.getProfile(userId);
    return {
      step1Completed: Boolean(
        profile?.fullName &&
          profile.college &&
          profile.degree &&
          profile.currentYear &&
          profile.specialization &&
          profile.gender &&
          profile.countryCode &&
          profile.mobileNumber,
      ),
      step2Completed: Boolean(profile?.verificationType && profile?.verificationDocUrl),
      profileCompleted: profile?.isComplete ?? false,
    };
  }

  async updateProfileStepOne(userId: string, dto: ProfileStepOneDto) {
    const optionSet = await this.getProfileOptions();
    if (!optionSet.specializations.includes(dto.specialization)) {
      throw new BadRequestException('Invalid specialization option');
    }
    // Allow any college name (handles "Other" option from UI)
    
    return this.usersService.upsertProfileStepOne(userId, dto);
  }

  async updateProfileVerification(userId: string, dto: ProfileVerificationDto) {
    const profile = await this.usersService.getProfile(userId);
    if (
      !profile ||
      !profile.fullName ||
      !profile.college ||
      !profile.degree ||
      !profile.currentYear ||
      !profile.specialization ||
      !profile.gender ||
      !profile.countryCode ||
      !profile.mobileNumber
    ) {
      throw new BadRequestException('Complete profile step 1 first');
    }

    return this.usersService.upsertProfileVerification(userId, dto);
  }

  listAllSpecializations() {
    return this.usersService.listAllSpecializations();
  }

  listAllColleges() {
    return this.usersService.listAllColleges();
  }

  createCollege(name: string) {
    return this.usersService.createCollege(name);
  }

  updateCollege(id: string, name: string) {
    return this.usersService.updateCollege(id, name);
  }

  deleteCollege(id: string) {
    return this.usersService.deleteCollege(id);
  }

  listAllDegrees() {
    return this.usersService.listAllDegrees();
  }

  createDegree(name: string) {
    return this.usersService.createDegree(name);
  }

  updateDegree(id: string, name: string) {
    return this.usersService.updateDegree(id, name);
  }

  deleteDegree(id: string) {
    return this.usersService.deleteDegree(id);
  }

  async listProfilesForSuperadmin() {
    const users = await this.usersService.listUsersWithProfiles();
    return users
      .filter((user) => user.role === Role.USER || user.role === Role.COMPANY)
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      }));
  }

  verifyProfileForSuperadmin(userId: string, verified: boolean) {
    return this.usersService.verifyUserProfile(userId, verified);
  }

  listPublicNotifications() {
    return this.usersService.listPublicNotifications();
  }

  listAllNotifications() {
    return this.usersService.listAllNotifications();
  }

  createNotification(dto: CreateNotificationDto) {
    return this.usersService.createNotification(dto);
  }

  updateNotification(id: string, dto: UpdateNotificationDto) {
    return this.usersService.updateNotification(id, dto);
  }

  deleteNotification(id: string) {
    return this.usersService.deleteNotification(id);
  }

  createSpecialization(name: string) {
    return this.usersService.createSpecialization(name);
  }

  updateSpecialization(id: string, dto: UpdateSpecializationDto) {
    return this.usersService.updateSpecialization(id, {
      name: dto.name?.trim(),
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    });
  }

  deleteSpecialization(id: string) {
    return this.usersService.deleteSpecialization(id);
  }

  async loginWithEmailPassword(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password');

    const isValidPassword = await compare(password, user.passwordHash);
    if (!isValidPassword) throw new UnauthorizedException('Invalid email or password');

    const profileCompleted = await this.usersService.isProfileCompleted(user.id);
    return this.issueToken(user.id, user.email, user.role, user.name, user.avatarUrl, profileCompleted, user.hasActiveSubscription);
  }

  async loginWithGoogleCode(code: string): Promise<AuthResponseDto> {
    const idToken = await this.exchangeGoogleCodeForIdToken(code);
    const tokenInfo = await this.verifyGoogleIdToken(idToken);
    return this.loginWithGoogleTokenInfo(tokenInfo);
  }

  async me(userId: string): Promise<AuthResponseDto['user']> {
    const user = await this.usersService.findByIdWithProfile(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return this.usersService.toPublicUserWithProfile(user);
  }

  buildGoogleStartUrl(state?: string): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
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
    const frontendOrigin = this.configService.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173';
    return this.configService.get<string>('GOOGLE_REDIRECT_URI') ?? `${frontendOrigin}/auth/google/callback`;
  }

  private get googleClientId(): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new UnauthorizedException('GOOGLE_CLIENT_ID is not configured');
    }

    return clientId;
  }

  private get googleClientSecret(): string {
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
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
      const errorText = await response.text();
      console.error('Google OAuth exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
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
      avatarUrl: tokenInfo.picture,
    });

    const profileCompleted = await this.usersService.isProfileCompleted(user.id);
    return this.issueToken(user.id, user.email, user.role, user.name, user.avatarUrl, profileCompleted, user.hasActiveSubscription);
  }

  private issueToken(
    id: string,
    email: string,
    role: Role,
    name: string,
    avatarUrl: string | null,
    profileCompleted: boolean,
    hasActiveSubscription: boolean,
  ): AuthResponseDto {
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
        avatarUrl,
        profileCompleted,
        hasActiveSubscription,
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
