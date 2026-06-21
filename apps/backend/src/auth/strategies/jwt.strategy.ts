import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { Role } from '../roles';
import { AUTH_COOKIE_NAME } from '../auth-cookie';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/** Pull the JWT from the httpOnly auth cookie. */
function cookieExtractor(req: Request): string | null {
  return (req?.cookies?.[AUTH_COOKIE_NAME] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
