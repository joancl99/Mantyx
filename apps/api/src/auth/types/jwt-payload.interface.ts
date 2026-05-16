import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  companyId: string | null;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
