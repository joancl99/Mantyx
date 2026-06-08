import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../types/jwt-payload.interface';

/**
 * Injects the authenticated user's `companyId` as a guaranteed non-null
 * `string`. The global `CompanyGuard` rejects company-less users on
 * tenant-scoped routes before the handler runs, so the value is always present
 * here; the runtime check is a defensive guard in case the decorator is ever
 * used on a route the guard does not cover. Replaces the `user.companyId!`
 * non-null assertions across tenant-scoped controllers.
 */
export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const user: JwtPayload | undefined = ctx.switchToHttp().getRequest().user;
    if (!user?.companyId) {
      throw new ForbiddenException('Missing company context');
    }
    return user.companyId;
  },
);
