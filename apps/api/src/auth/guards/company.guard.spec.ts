import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CompanyGuard } from './company.guard';

function context(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

/** reflector.getAllAndOverride is called for IS_PUBLIC then ALLOW_NO_COMPANY. */
function guardWith(isPublic: boolean, allowNoCompany: boolean): CompanyGuard {
  const getAllAndOverride = jest
    .fn()
    .mockReturnValueOnce(isPublic)
    .mockReturnValueOnce(allowNoCompany);
  return new CompanyGuard({ getAllAndOverride } as never);
}

describe('CompanyGuard', () => {
  it('allows public routes regardless of company', () => {
    expect(guardWith(true, false).canActivate(context(undefined))).toBe(true);
  });

  it('allows @AllowNoCompany routes (SUPERADMIN platform panel)', () => {
    expect(
      guardWith(false, true).canActivate(
        context({ sub: 'u', companyId: null }),
      ),
    ).toBe(true);
  });

  it('rejects an authenticated user with no company on a scoped route', () => {
    expect(() =>
      guardWith(false, false).canActivate(
        context({ sub: 'u', companyId: null }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows an authenticated user that belongs to a company', () => {
    expect(
      guardWith(false, false).canActivate(
        context({ sub: 'u', companyId: 'company-1' }),
      ),
    ).toBe(true);
  });
});
