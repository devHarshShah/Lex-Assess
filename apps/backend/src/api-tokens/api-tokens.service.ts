import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export const API_TOKEN_PREFIX = 'lxa_';
const DISPLAY_PREFIX_LENGTH = 8;
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;
const ALLOWED_OWNER_ROLES: Role[] = [Role.ADMIN, Role.SUPERADMIN];

export interface ApiTokenPrincipal {
  tokenId: string;
  tokenPrefix: string;
  id: string;
  sub: string;
  email: string;
  name: string | null;
  role: Role;
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateApiToken(): string {
  return `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

@Injectable()
export class ApiTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** URL for Claude.ai custom connectors, which can't send an Authorization header. */
  private connectorUrl(token: string): string {
    const api = (
      this.config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${api}/mcp/t/${token}`;
  }

  /**
   * Issues a token owned by `ownerEmail` (or by the issuing superadmin when omitted).
   * The plaintext is returned exactly once; only its hash is stored.
   */
  async create(
    issuerId: string,
    input: { name: string; ownerEmail?: string; expiresInDays?: number },
  ) {
    const owner = input.ownerEmail
      ? await this.prisma.user.findUnique({
          where: { email: input.ownerEmail.trim().toLowerCase() },
        })
      : await this.prisma.user.findUnique({ where: { id: issuerId } });
    if (!owner) throw new NotFoundException('No user with that email');
    if (!ALLOWED_OWNER_ROLES.includes(owner.role)) {
      throw new BadRequestException(
        'API tokens can only be issued to admins or superadmins',
      );
    }

    const token = generateApiToken();
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const record = await this.prisma.apiToken.create({
      data: {
        name: input.name.trim(),
        userId: owner.id,
        tokenHash: hashApiToken(token),
        prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...record,
      token,
      connectorUrl: this.connectorUrl(token),
      owner: { id: owner.id, name: owner.name, email: owner.email },
    };
  }

  list() {
    return this.prisma.apiToken.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async revoke(id: string) {
    const token = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!token) throw new NotFoundException('Token not found');
    if (token.revokedAt) return { success: true };
    await this.prisma.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Resolves a presented plaintext token to its owner, or null if it is unknown,
   * revoked, expired, or its owner is no longer an admin.
   */
  async authenticate(
    plaintext: string | undefined | null,
  ): Promise<ApiTokenPrincipal | null> {
    if (!plaintext || !plaintext.startsWith(API_TOKEN_PREFIX)) return null;

    const token = await this.prisma.apiToken.findUnique({
      where: { tokenHash: hashApiToken(plaintext) },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
    if (!token || token.revokedAt) return null;
    if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) return null;
    if (!ALLOWED_OWNER_ROLES.includes(token.user.role)) return null;

    if (
      !token.lastUsedAt ||
      Date.now() - token.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS
    ) {
      await this.prisma.apiToken.update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
      });
    }

    return {
      tokenId: token.id,
      tokenPrefix: token.prefix,
      id: token.user.id,
      sub: token.user.id,
      email: token.user.email,
      name: token.user.name,
      role: token.user.role,
    };
  }
}
