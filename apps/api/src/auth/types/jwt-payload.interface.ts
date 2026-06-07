import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
  /** JWT id — used to revoke a specific access token via the Redis denylist. */
  jti?: string;
  /** Standard claims added by passport-jwt on verification. */
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
