import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileController } from './profile.controller';
import { RbacDemoController } from './rbac-demo.controller';
import { SuperadminSpecializationsController } from './superadmin-specializations.controller';
import { SuperadminUsersController } from './superadmin-users.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'lexassess-dev-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    AuthController,
    ProfileController,
    RbacDemoController,
    SuperadminUsersController,
    SuperadminSpecializationsController,
    UploadsController,
  ],
  providers: [AuthService, UsersService, PrismaService, JwtStrategy, UploadsService],
  exports: [AuthService],
})
export class AuthModule {}
