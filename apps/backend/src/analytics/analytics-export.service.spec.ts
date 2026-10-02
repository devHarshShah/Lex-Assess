import ExcelJS from 'exceljs';
import { AnalyticsExportService } from './analytics-export.service';

describe('AnalyticsExportService', () => {
  it('builds a workbook with Users and Summary sheets', async () => {
    const row = {
      id: 'u1', name: 'A', email: 'a@x.com', role: 'USER', authProvider: 'EMAIL',
      registeredAt: '2026-10-01T00:00:00.000Z', mobile: null, college: 'C', degree: 'LLB',
      currentYear: '3', specialization: null, profileStarted: true, profileComplete: false,
      paymentInitiated: true, couponCode: 'FREE1', trialEndsAt: null, hasActiveSubscription: false,
      paymentCount: 0, totalPaidInr: 0, lastPaymentAt: null, stage: 'PAYMENT_INITIATED',
      stageLabel: 'Payment initiated, not active',
    };
    const svc = new AnalyticsExportService({ buildRows: jest.fn().mockResolvedValue([row]) } as any);
    const buf = await svc.buildWorkbook({});
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Users', 'Summary']);
    expect(wb.getWorksheet('Users')!.getRow(2).getCell(2).value).toBe('a@x.com');
    expect(wb.getWorksheet('Users')!.getRow(2).getCell(13).value).toBe('Yes');
  });
});
