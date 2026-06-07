import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { denylistKey } from '../token-denylist';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Reject access tokens revoked via logout before their natural expiry.
    if (payload.jti) {
      const revoked = await this.redis.get(denylistKey(payload.jti));
      if (revoked) throw new UnauthorizedException('Token revoked');
    }

    // Re-validate against the live user so deactivation and role/company
    // changes take effect immediately instead of waiting for token expiry.
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Access denied');
    }

    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
