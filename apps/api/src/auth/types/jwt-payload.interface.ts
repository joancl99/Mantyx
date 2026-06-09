import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  /** JWT id — used to revoke a specific access token via the Redis denylist. */
  jti?: string;
  /**
   * Session id — stable across refresh rotations within one login. Keys the
   * per-device refresh token in Redis so concurrent sessions coexist and
   * logout/refresh target a single session. See {@link refreshKey}.
   */
  sid?: string;
  /** Standard claims added by passport-jwt on verification. */
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
