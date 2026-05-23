import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RbacDemoController } from './rbac-demo.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'lexassess-dev-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, RbacDemoController],
  providers: [AuthService, UsersService, PrismaService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
