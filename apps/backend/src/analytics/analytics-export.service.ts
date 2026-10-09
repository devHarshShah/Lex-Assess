import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { AnalyticsService } from './analytics.service';
import { STAGE_LABELS, type AnalyticsFilters, type FunnelStage } from './analytics.types';

@Injectable()
export class AnalyticsExportService {
  constructor(private readonly analytics: AnalyticsService) {}

  async buildWorkbook(filters: AnalyticsFilters): Promise<Buffer> {
    const rows = await this.analytics.buildRows(filters);
    const wb = new ExcelJS.Workbook();

    const ws = wb.addWorksheet('Users', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Sign-in', key: 'authProvider', width: 10 },
      { header: 'Registered on', key: 'registeredAt', width: 18 },
      { header: 'Mobile', key: 'mobile', width: 16 },
      { header: 'College', key: 'college', width: 28 },
      { header: 'Degree', key: 'degree', width: 16 },
      { header: 'Year', key: 'currentYear', width: 10 },
      { header: 'Specialization', key: 'specialization', width: 22 },
      { header: 'Profile started', key: 'profileStarted', width: 14 },
      { header: 'Profile complete', key: 'profileComplete', width: 15 },
      { header: 'Payment initiated', key: 'paymentInitiated', width: 16 },
      { header: 'Coupon', key: 'couponCode', width: 14 },
      { header: 'Trial ends', key: 'trialEndsAt', width: 18 },
      { header: 'Active subscription', key: 'hasActiveSubscription', width: 18 },
      { header: 'Access until (autopay cancelled)', key: 'accessEndsAt', width: 24 },
      { header: 'Payments', key: 'paymentCount', width: 10 },
      { header: 'Total paid (INR)', key: 'totalPaidInr', width: 16 },
      { header: 'Last payment', key: 'lastPaymentAt', width: 18 },
      { header: 'Stage', key: 'stageLabel', width: 30 },
      { header: 'CRM status', key: 'crmStatus', width: 16 },
      { header: 'Last contacted', key: 'lastContactedAt', width: 18 },
      { header: 'Company interviews', key: 'companyInterviews', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };

    const yn = (b: boolean) => (b ? 'Yes' : 'No');
    const date = (s: string | null) => (s ? new Date(s) : null);
    for (const r of rows) {
      ws.addRow({
        ...r,
        registeredAt: date(r.registeredAt),
        trialEndsAt: date(r.trialEndsAt),
        accessEndsAt: date(r.accessEndsAt),
        lastPaymentAt: date(r.lastPaymentAt),
        lastContactedAt: date(r.lastContactedAt),
        profileStarted: yn(r.profileStarted),
        profileComplete: yn(r.profileComplete),
        paymentInitiated: yn(r.paymentInitiated),
        hasActiveSubscription: yn(r.hasActiveSubscription),
      });
    }
    for (const key of ['registeredAt', 'trialEndsAt', 'accessEndsAt', 'lastPaymentAt', 'lastContactedAt']) {
      ws.getColumn(key).numFmt = 'dd-mmm-yyyy hh:mm';
    }
    ws.getColumn('totalPaidInr').numFmt = '#,##0.00';
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

    const summary = wb.addWorksheet('Summary');
    summary.columns = [
      { header: 'Stage', key: 'stage', width: 36 },
      { header: 'Users', key: 'count', width: 10 },
    ];
    summary.getRow(1).font = { bold: true };
    for (const stage of Object.keys(STAGE_LABELS) as FunnelStage[]) {
      summary.addRow({
        stage: STAGE_LABELS[stage],
        count: rows.filter((r) => r.stage === stage).length,
      });
    }
    summary.addRow({ stage: 'Total (matching filters)', count: rows.length }).font = { bold: true };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
