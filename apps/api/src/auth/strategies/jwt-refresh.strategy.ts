import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { REFRESH_COOKIE } from '../refresh-cookie';
import { JwtPayload, JwtRefreshPayload } from '../types/jwt-payload.interface';

const cookieExtractor = (req: Request): string | null =>
  (req?.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const refreshToken = req?.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    return { ...payload, refreshToken };
  }
}
