import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MaintenanceState {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
}

const MAINTENANCE_KEY = 'maintenance';
const DEFAULT_MESSAGE = "LexAssess is undergoing scheduled maintenance. We'll be back shortly.";
// Up to 3 Cloud Run instances each cache this; a toggle reaches all of them within this window
const CACHE_MS = 10_000;

@Injectable()
export class SettingsService {
  private cached: { state: MaintenanceState; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getMaintenance(): Promise<MaintenanceState> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.state;
    const row = await this.prisma.appSetting.findUnique({ where: { key: MAINTENANCE_KEY } });
    const value = (row?.value ?? {}) as Partial<MaintenanceState>;
    const state: MaintenanceState = {
      enabled: value.enabled === true,
      message: value.message?.trim() || DEFAULT_MESSAGE,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
    this.cached = { state, at: Date.now() };
    return state;
  }

  async setMaintenance(input: { enabled: boolean; message?: string }): Promise<MaintenanceState> {
    const value = { enabled: input.enabled, message: input.message?.trim() || DEFAULT_MESSAGE } as Prisma.InputJsonObject;
    await this.prisma.appSetting.upsert({
      where: { key: MAINTENANCE_KEY },
      create: { key: MAINTENANCE_KEY, value },
      update: { value },
    });
    this.cached = null;
    return this.getMaintenance();
  }
}
