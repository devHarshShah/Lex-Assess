import { BadRequestException } from '@nestjs/common';
import { CrmService } from './crm.service';
import { autoStatus, istDayBounds } from './crm.types';

describe('autoStatus', () => {
  it('moves new leads forward based on the call outcome', () => {
    expect(autoStatus('NEW', 'CALL', 'NO_ANSWER')).toBe('ATTEMPTED');
    expect(autoStatus('ATTEMPTED', 'CALL', 'BUSY')).toBe('ATTEMPTED');
    expect(autoStatus('NEW', 'CALL', 'CONNECTED')).toBe('CONTACTED');
    expect(autoStatus('ATTEMPTED', 'CALL', 'CONNECTED')).toBe('CONTACTED');
    expect(autoStatus('NEW', 'WHATSAPP', null)).toBe('CONTACTED');
    expect(autoStatus('INTERESTED', 'CALL', 'CONNECTED')).toBe('INTERESTED');
    expect(autoStatus('CONTACTED', 'CALL', 'WRONG_NUMBER')).toBe('INVALID_NUMBER');
    expect(autoStatus('CONTACTED', 'CALL', 'CALLBACK_REQUESTED')).toBe('FOLLOW_UP');
  });

  it('never reopens closed leads and ignores notes', () => {
    expect(autoStatus('DO_NOT_CONTACT', 'CALL', 'CONNECTED')).toBe('DO_NOT_CONTACT');
    expect(autoStatus('NEW', 'NOTE', null)).toBe('NEW');
  });
});

describe('istDayBounds', () => {
  it('uses the IST calendar day', () => {
    // 20:00 UTC on 9 Oct is 01:30 IST on 10 Oct
    const { start, end } = istDayBounds(new Date('2026-10-09T20:00:00Z'));
    expect(start.toISOString()).toBe('2026-10-09T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-10-10T18:29:59.999Z');
  });
});

function build(lead: any = null) {
  const created: any[] = [];
  const tx: any = {
    crmLead: {
      findUnique: jest.fn().mockResolvedValue(lead),
      upsert: jest.fn(async (args: any) => ({ ...(lead ?? {}), ...args.create, ...args.update })),
    },
    crmActivity: {
      create: jest.fn(async ({ data }: any) => (created.push(data), data)),
      createMany: jest.fn(async ({ data }: any) => (created.push(...data), { count: data.length })),
    },
  };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'USER' }) },
    crmLead: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const analytics: any = { rowsForUsers: jest.fn().mockResolvedValue([{ id: 'u1', stage: 'PROFILE_COMPLETE' }]), buildRows: jest.fn() };
  return { svc: new CrmService(prisma, analytics, {} as any), tx, created, prisma, analytics };
}

describe('CrmService.logActivity', () => {
  it('logs a missed call on a new lead as ATTEMPTED with a status change entry', async () => {
    const { svc, tx, created } = build();
    await svc.logActivity('u1', 'admin', { type: 'CALL', callOutcome: 'NO_ANSWER', note: ' rang twice ' });
    const upsert = tx.crmLead.upsert.mock.calls[0][0];
    expect(upsert.create).toMatchObject({ status: 'ATTEMPTED', contactAttempts: 1 });
    expect(created[0]).toMatchObject({ type: 'CALL', callOutcome: 'NO_ANSWER', note: 'rang twice', stageAtActivity: 'PROFILE_COMPLETE' });
    expect(created[1]).toMatchObject({ type: 'STATUS_CHANGE', fromStatus: 'NEW', toStatus: 'ATTEMPTED' });
  });

  it('increments attempts and clears the follow-up once connected', async () => {
    const { svc, tx, created } = build({ userId: 'u1', status: 'FOLLOW_UP', nextFollowUpAt: new Date('2026-10-10'), contactAttempts: 2 });
    await svc.logActivity('u1', 'admin', { type: 'CALL', callOutcome: 'CONNECTED', status: 'INTERESTED' });
    const upsert = tx.crmLead.upsert.mock.calls[0][0];
    expect(upsert.update).toMatchObject({ status: 'INTERESTED', nextFollowUpAt: null, contactAttempts: { increment: 1 } });
    expect(created[1]).toMatchObject({ fromStatus: 'FOLLOW_UP', toStatus: 'INTERESTED' });
  });

  it('validates input', async () => {
    const { svc } = build();
    await expect(svc.logActivity('u1', 'a', { type: 'CALL' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.logActivity('u1', 'a', { type: 'CALL', callOutcome: 'CALLBACK_REQUESTED' })).rejects.toThrow(/call back/);
    await expect(svc.logActivity('u1', 'a', { type: 'NOTE' })).rejects.toThrow(/Write the note/);
    await expect(svc.logActivity('u1', 'a', { type: 'STATUS_CHANGE' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.logActivity('u1', 'a', { type: 'NOTE', note: 'x', status: 'BOGUS' })).rejects.toThrow(/Unknown status/);
  });

  it('a note does not count as a contact attempt', async () => {
    const { svc, tx, created } = build();
    await svc.logActivity('u1', 'admin', { type: 'NOTE', note: 'Asked about fees on Instagram' });
    expect(tx.crmLead.upsert.mock.calls[0][0].create).toMatchObject({ status: 'NEW', contactAttempts: 0, lastContactedAt: null });
    expect(created).toHaveLength(1);
  });
});

describe('CrmService.updateLead', () => {
  it('closing a lead clears its follow-up and records the change', async () => {
    const { svc, tx, created } = build({ userId: 'u1', status: 'CONTACTED', nextFollowUpAt: new Date('2026-10-10') });
    await svc.updateLead('u1', 'admin', { status: 'NOT_INTERESTED', note: 'Joined another firm' });
    expect(tx.crmLead.upsert.mock.calls[0][0].update).toMatchObject({ status: 'NOT_INTERESTED', nextFollowUpAt: null });
    expect(created).toEqual([expect.objectContaining({ type: 'STATUS_CHANGE', toStatus: 'NOT_INTERESTED', note: 'Joined another firm' })]);
  });

  it('records a new follow-up date', async () => {
    const { svc, created } = build({ userId: 'u1', status: 'CONTACTED', nextFollowUpAt: null });
    await svc.updateLead('u1', 'admin', { nextFollowUpAt: '2026-10-12T05:30:00Z' });
    expect(created).toEqual([expect.objectContaining({ type: 'FOLLOW_UP_SET' })]);
  });
});

describe('CrmService.listLeads', () => {
  const row = (id: string, extra: any = {}) => ({
    id, name: id, email: `${id}@x.test`, mobile: '+919999999999', college: 'NLU', specialization: null,
    stage: 'PROFILE_COMPLETE', stageLabel: '', registeredAt: '2026-10-01T00:00:00Z', profileComplete: true, ...extra,
  });

  it('only includes completed profiles with a phone and buckets queues', async () => {
    const { svc, prisma, analytics } = build();
    analytics.buildRows.mockResolvedValue([row('a'), row('b'), row('c'), row('nophone', { mobile: null }), row('incomplete', { profileComplete: false })]);
    prisma.crmLead.findMany.mockResolvedValue([
      { userId: 'b', status: 'FOLLOW_UP', nextFollowUpAt: new Date(Date.now() - 3 * 86_400_000), contactAttempts: 1, tags: [], priority: 'MEDIUM' },
      { userId: 'c', status: 'CONTACTED', nextFollowUpAt: null, contactAttempts: 2, tags: [], priority: 'HIGH' },
    ]);
    const out = await svc.listLeads({ queue: 'all' });
    expect(out.total).toBe(3);
    expect(out.queueCounts).toEqual({ due: 0, overdue: 1, new: 1, all: 3 });
    expect(out.rows[0]!.userId).toBe('b');
    const overdue = await svc.listLeads({ queue: 'overdue' });
    expect(overdue.rows.map((r) => r.userId)).toEqual(['b']);
  });
});
