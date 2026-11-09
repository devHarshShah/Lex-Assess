import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTokensService, hashApiToken } from './api-tokens.service';

const TOKEN = 'lxa_testtoken';

function setup(record: any, users: Record<string, any> = {}) {
  const prisma: any = {
    apiToken: {
      findUnique: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((args: any) =>
        Promise.resolve({ id: 't1', ...args.data }),
      ),
    },
    user: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(users[where.id ?? where.email] ?? null),
      ),
    },
  };
  return {
    service: new ApiTokensService(prisma, {
      get: () => 'https://api.example.com/',
    } as any),
    prisma,
  };
}

const admin = { id: 'u1', email: 'a@x.com', name: 'Admin', role: Role.ADMIN };
const live = {
  id: 't1',
  prefix: 'lxa_test',
  revokedAt: null,
  expiresAt: null,
  lastUsedAt: null,
  user: admin,
};

describe('ApiTokensService.authenticate', () => {
  it('accepts a live token, looked up by hash, and records use', async () => {
    const { service, prisma } = setup(live);
    await expect(service.authenticate(TOKEN)).resolves.toMatchObject({
      id: 'u1',
      role: Role.ADMIN,
      tokenId: 't1',
    });
    expect(prisma.apiToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashApiToken(TOKEN) } }),
    );
    expect(prisma.apiToken.update).toHaveBeenCalled();
  });

  it('does not write lastUsedAt on every call', async () => {
    const { service, prisma } = setup({ ...live, lastUsedAt: new Date() });
    await service.authenticate(TOKEN);
    expect(prisma.apiToken.update).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined, live],
    ['wrong prefix', 'abc', live],
    ['unknown', TOKEN, null],
    ['revoked', TOKEN, { ...live, revokedAt: new Date() }],
    ['expired', TOKEN, { ...live, expiresAt: new Date(Date.now() - 1000) }],
    ['owner demoted', TOKEN, { ...live, user: { ...admin, role: Role.USER } }],
  ])('rejects a %s token', async (_n, token, record) => {
    const { service } = setup(record);
    await expect(service.authenticate(token)).resolves.toBeNull();
  });
});

describe('ApiTokensService.create', () => {
  it('stores only the hash and returns the plaintext once', async () => {
    const { service, prisma } = setup(null, { u1: admin });
    const result = await service.create('u1', { name: 'Claude' });
    expect(result.token).toMatch(/^lxa_/);
    const stored = prisma.apiToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(hashApiToken(result.token));
    expect(stored).not.toHaveProperty('token');
    expect(stored.prefix).toBe(result.token.slice(0, 8));
    expect(result.connectorUrl).toBe(
      `https://api.example.com/mcp/t/${result.token}`,
    );
  });

  it('refuses to issue a token to a non-admin', async () => {
    const student = { ...admin, id: 'u2', email: 's@x.com', role: Role.USER };
    const { service } = setup(null, { 's@x.com': student });
    await expect(
      service.create('u1', { name: 'x', ownerEmail: 's@x.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
