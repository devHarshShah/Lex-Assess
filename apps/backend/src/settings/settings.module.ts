import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceController, SuperadminMaintenanceController } from './maintenance.controller';
import { MaintenanceGuard } from './maintenance.guard';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    // Verify-only: lets the global MaintenanceGuard recognise a superadmin from the auth cookie
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [MaintenanceController, SuperadminMaintenanceController],
  providers: [SettingsService, PrismaService, MaintenanceGuard],
  exports: [SettingsService, MaintenanceGuard, JwtModule],
})
export class SettingsModule {}
