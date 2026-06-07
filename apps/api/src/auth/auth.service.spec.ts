import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { denylistKey } from './token-denylist';
import { JwtPayload } from './types/jwt-payload.interface';

function setup() {
  const redis = {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    increment: jest.fn(),
  } as any;
  const users = { findByEmail: jest.fn() } as any;
  const jwt = {} as any;
  const config = { getOrThrow: jest.fn().mockReturnValue('secret') } as any;
  const service = new AuthService(users, jwt, redis, config);
  return { redis, users, service };
}

describe('AuthService.logout', () => {
  const NOW = 1_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  });

  afterEach(() => jest.restoreAllMocks());

  const baseUser: JwtPayload = {
    sub: 'user-1',
    email: 'a@b.com',
    name: 'A',
    role: Role.OPERATOR,
    companyId: 'company-1',
  };

  it('deletes the stored refresh token and denylists the access token jti', async () => {
    const { redis, service } = setup();

    await service.logout({ ...baseUser, jti: 'jti-1', exp: NOW + 600 });

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1');
    expect(redis.set).toHaveBeenCalledWith(denylistKey('jti-1'), '1', 600);
  });

  it('does not denylist when the access token is already expired', async () => {
    const { redis, service } = setup();

    await service.logout({ ...baseUser, jti: 'jti-1', exp: NOW - 5 });

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1');
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('still clears the refresh token when the token carries no jti', async () => {
    const { redis, service } = setup();

    await service.logout(baseUser);

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1');
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe('AuthService.login lockout', () => {
  const dto = { email: 'User@Example.com', password: 'secret' };
  const lockKey = 'login-fail:user@example.com';

  it('blocks with 429 once the failure threshold is reached', async () => {
    const { redis, users, service } = setup();
    redis.get.mockResolvedValue('5'); // >= MAX_LOGIN_ATTEMPTS

    await expect(service.login(dto)).rejects.toMatchObject({ status: 429 });
    // Locked out before even looking up the user.
    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it('increments the per-account failure counter on invalid credentials', async () => {
    const { redis, users, service } = setup();
    redis.get.mockResolvedValue(null);
    users.findByEmail.mockResolvedValue(null);

    await expect(service.login(dto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(redis.increment).toHaveBeenCalledWith(lockKey, 15 * 60);
  });
});
