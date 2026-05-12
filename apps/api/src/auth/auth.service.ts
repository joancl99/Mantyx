import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.interface';

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

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

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const user = await this.users.create(dto.email, dto.name, dto.password);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new ForbiddenException('Account is deactivated');

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

  async logout(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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
      this.jwt.signAsync(payload, signOpts(this.accessSecret, this.accessExpiry)),
      this.jwt.signAsync(payload, signOpts(this.refreshSecret, this.refreshExpiry)),
    ]);

    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.redis.set(`refresh:${user.id}`, hashed, REFRESH_TTL);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
