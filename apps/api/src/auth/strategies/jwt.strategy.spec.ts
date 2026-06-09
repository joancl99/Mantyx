import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { row } from '../../testing/prisma-mock';
import { denylistKey } from '../token-denylist';
import { JwtPayload } from '../types/jwt-payload.interface';
import { JwtStrategy } from './jwt.strategy';

function setup() {
  const redis = mockDeep<RedisService>();
  const users = mockDeep<UsersService>();
  const config = mockDeep<ConfigService>();
  config.getOrThrow.mockReturnValue('access-secret');
  const strategy = new JwtStrategy(config, redis, users);
  return { redis, users, strategy };
}

const payload: JwtPayload = {
  sub: 'user-1',
  email: 'old@example.com',
  name: 'Old Name',
  role: Role.OPERATOR,
  companyId: 'company-1',
  jti: 'jti-1',
  sid: 'sess-1',
  iat: 1000,
  exp: 2000,
};

describe('JwtStrategy', () => {
  it('rejects an access token whose jti has been revoked', async () => {
    const { redis, users, strategy } = setup();
    redis.get.mockResolvedValue('1');

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(redis.get).toHaveBeenCalledWith(denylistKey('jti-1'));
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rejects a token whose user no longer exists', async () => {
    const { redis, users, strategy } = setup();
    redis.get.mockResolvedValue(null);
    users.findById.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token whose user has been deactivated', async () => {
    const { redis, users, strategy } = setup();
    redis.get.mockResolvedValue(null);
    users.findById.mockResolvedValue(row({ id: 'user-1', isActive: false }));

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns the live user role/company, not the stale token claims', async () => {
    const { redis, users, strategy } = setup();
    redis.get.mockResolvedValue(null);
    users.findById.mockResolvedValue(
      row({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New Name',
        role: Role.ADMIN,
        companyId: 'company-2',
        isActive: true,
      }),
    );

    await expect(strategy.validate(payload)).resolves.toEqual({
      sub: 'user-1',
      email: 'new@example.com',
      name: 'New Name',
      role: Role.ADMIN,
      companyId: 'company-2',
      jti: 'jti-1',
      sid: 'sess-1',
      iat: 1000,
      exp: 2000,
    });
  });
});
