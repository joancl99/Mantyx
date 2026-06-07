import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { denylistKey } from './token-denylist';
import { JwtPayload } from './types/jwt-payload.interface';

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// Per-account login lockout: after this many consecutive failures the account
// is locked for the window. Complements the per-IP throttle, stopping slow /
// distributed brute force against a single account.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow('JWT_REFRESH_SECRET');
    this.accessExpiry = config.getOrThrow('JWT_ACCESS_EXPIRES_IN');
    this.refreshExpiry = config.getOrThrow('JWT_REFRESH_EXPIRES_IN');
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const lockKey = `login-fail:${dto.email.trim().toLowerCase()}`;

    const attempts = Number((await this.redis.get(lockKey)) ?? 0);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new HttpException(
        'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.users.findByEmail(dto.email);
    const valid = user && (await bcrypt.compare(dto.password, user.password));
    if (!valid) {
      await this.redis.increment(lockKey, LOGIN_LOCK_SECONDS);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) throw new ForbiddenException('Account is deactivated');

    // Successful credentials — reset the failure counter.
    await this.redis.del(lockKey);
    return this.issueTokens(user);
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthTokensDto> {
    const stored = await this.redis.get(`refresh:${userId}`);
    if (!stored) throw new ForbiddenException('Session expired');

    const match = await bcrypt.compare(refreshToken, stored);
    if (!match) throw new ForbiddenException('Invalid refresh token');

    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new ForbiddenException('Access denied');

    return this.issueTokens(user);
  }

  async logout(user: JwtPayload): Promise<void> {
    await this.redis.del(`refresh:${user.sub}`);

    // Revoke the access token used for this request so it cannot be reused
    // before its natural expiry. TTL = remaining lifetime of the token.
    if (user.jti && user.exp) {
      const ttl = user.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.set(denylistKey(user.jti), '1', ttl);
      }
    }
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      jti,
    };

    const signOpts = (secret: string, expiresIn: string) => ({
      secret,
      // ms.StringValue branded type — string is safe at runtime
      expiresIn: expiresIn as Parameters<typeof this.jwt.signAsync>[1] extends
        | undefined
        | infer O
        ? O extends { expiresIn?: infer E }
          ? E
          : never
        : never,
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        payload,
        signOpts(this.accessSecret, this.accessExpiry),
      ),
      this.jwt.signAsync(
        payload,
        signOpts(this.refreshSecret, this.refreshExpiry),
      ),
    ]);

    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.redis.set(`refresh:${user.id}`, hashed, REFRESH_TTL);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}
