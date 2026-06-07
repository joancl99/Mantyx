import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_NO_COMPANY_KEY } from '../decorators/allow-no-company.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../types/jwt-payload.interface';

/**
 * Enforces tenant context: every authenticated route is company-scoped unless
 * marked @Public or @AllowNoCompany. Without this guard an authenticated user
 * with no companyId (e.g. a self-registered account, or a SUPERADMIN hitting a
 * tenant route) would reach a service that passes `companyId: null` to Prisma
 * and crash with a 500. We fail closed with a clear 403 instead.
 */
@Injectable()
export class CompanyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const skip =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) ||
      this.reflector.getAllAndOverride<boolean>(ALLOW_NO_COMPANY_KEY, targets);
    if (skip) return true;

    const user: JwtPayload | undefined = context
      .switchToHttp()
      .getRequest().user;

    if (user && !user.companyId) {
      throw new ForbiddenException('No company assigned to this account');
    }
    return true;
  }
}
