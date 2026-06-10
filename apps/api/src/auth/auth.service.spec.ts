import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { denylistKey } from './token-denylist';
import { JwtPayload } from './types/jwt-payload.interface';

function setup() {
  const redis = mockDeep<RedisService>();
  const users = mockDeep<UsersService>();
  const jwt = mockDeep<JwtService>();
  const config = mockDeep<ConfigService>();
  const audit = mockDeep<AuditService>();
  config.getOrThrow.mockReturnValue('secret');
  const service = new AuthService(users, jwt, redis, audit, config);
  return { redis, users, audit, service };
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
    sid: 'sess-1',
  };

  it('deletes only the current session refresh token and denylists the jti', async () => {
    const { redis, service } = setup();

    await service.logout({ ...baseUser, jti: 'jti-1', exp: NOW + 600 });

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:sess-1');
    expect(redis.set).toHaveBeenCalledWith(denylistKey('jti-1'), '1', 600);
  });

  it('does not denylist when the access token is already expired', async () => {
    const { redis, service } = setup();

    await service.logout({ ...baseUser, jti: 'jti-1', exp: NOW - 5 });

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:sess-1');
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('still clears the session refresh token when the token carries no jti', async () => {
    const { redis, service } = setup();

    await service.logout(baseUser);

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:sess-1');
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('does not delete any session for a legacy token without a sid', async () => {
    const { redis, service } = setup();

    await service.logout({ ...baseUser, sid: undefined });

    expect(redis.del).not.toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  it('rejects a refresh token that carries no session id', async () => {
    const { redis, service } = setup();

    await expect(service.refresh('user-1', undefined, 'token')).rejects.toThrow(
      'Session expired',
    );
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('reads the refresh token for the specific session', async () => {
    const { redis, service } = setup();
    redis.get.mockResolvedValue(null);

    await expect(service.refresh('user-1', 'sess-1', 'token')).rejects.toThrow(
      'Session expired',
    );
    expect(redis.get).toHaveBeenCalledWith('refresh:user-1:sess-1');
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
