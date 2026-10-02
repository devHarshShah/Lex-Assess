import { RankingService } from './ranking.service';

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);
const release = { id: 'rel1', label: 'R1', releasedAt: new Date(), candidateCount: 3 };

function entry(userId: string, rank: number, user: { hasActiveSubscription: boolean; accessEndsAt: Date | null }) {
  return { userId, rank, anonymizedId: `A${rank}`, practiceArea: 'IPR', user, commonScore: 50 };
}

function setup(entries: any[], countResult = 0) {
  const prisma: any = {
    rankRelease: { findFirst: jest.fn().mockResolvedValue(release) },
    rankEntry: {
      findMany: jest.fn().mockResolvedValue(entries),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(countResult),
    },
  };
  return { service: new RankingService(prisma), prisma };
}

describe('RankingService soft delete', () => {
  const active = { hasActiveSubscription: true, accessEndsAt: null };
  const lapsed = { hasActiveSubscription: true, accessEndsAt: past };

  it('admin list keeps lapsed students, marks them, and renumbers the rest', async () => {
    const { service } = setup([entry('a', 1, active), entry('b', 2, lapsed), entry('c', 3, { hasActiveSubscription: true, accessEndsAt: future })]);
    const { entries } = await service.getReleasedFullLeaderboard();
    expect(entries.map((e: any) => [e.studentId, e.rank, e.releasedRank, e.softDeleted])).toEqual([
      ['a', 1, 1, false],
      ['b', null, 2, true],
      ['c', 2, 3, false],
    ]);
  });

  it('public list filters by access and renumbers', async () => {
    const { service, prisma } = setup([{ anonymizedId: 'A1', practiceArea: 'IPR' }, { anonymizedId: 'A3', practiceArea: 'IPR' }]);
    const { entries } = await service.getReleasedLeaderboard();
    expect(prisma.rankEntry.findMany.mock.calls[0][0].where.user).toBeDefined();
    expect(entries.map((e) => e.rank)).toEqual([1, 2]);
  });

  it('own released rank is renumbered for active students, raw for lapsed ones', async () => {
    const a = setup([], 1);
    a.prisma.rankEntry.findUnique.mockResolvedValue({ rank: 3, commonScore: 50, user: active });
    expect((await a.service.getReleasedRank('c'))?.rank).toBe(2);

    const b = setup([], 1);
    b.prisma.rankEntry.findUnique.mockResolvedValue({ rank: 3, commonScore: 50, user: lapsed });
    expect((await b.service.getReleasedRank('c'))?.rank).toBe(3);
  });
});
