import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthRequestMeta, AuthService } from './auth.service';
import { AllowNoCompany } from './decorators/allow-no-company.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  AccessTokenDto,
  AuthSessionDto,
  AuthTokensDto,
} from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { clearRefreshCookie, setRefreshCookie } from './refresh-cookie';
import { JwtPayload, JwtRefreshPayload } from './types/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.isProd = config.get<string>('NODE_ENV') === 'production';
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthSessionDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionDto> {
    return this.issueSession(await this.auth.login(dto, requestMeta(req)), res);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using the refresh cookie' })
  @ApiResponse({ status: 200, type: AccessTokenDto })
  async refresh(
    @CurrentUser() user: JwtRefreshPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenDto> {
    const tokens = await this.auth.refresh(
      user.sub,
      user.sid,
      user.refreshToken,
    );
    setRefreshCookie(res, tokens.refreshToken, this.isProd);
    return { accessToken: tokens.accessToken };
  }

  // Session routes are not tenant-scoped: a SUPERADMIN (companyId null) must
  // be able to log out too, otherwise their access token is never revoked.
  @AllowNoCompany()
  @SkipThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Logout, revoke access token and clear the refresh cookie',
  })
  @ApiResponse({ status: 204 })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user, requestMeta(req));
    clearRefreshCookie(res, this.isProd);
  }

  private issueSession(tokens: AuthTokensDto, res: Response): AuthSessionDto {
    setRefreshCookie(res, tokens.refreshToken, this.isProd);
    return { accessToken: tokens.accessToken, user: tokens.user };
  }
}

function requestMeta(req: Request): AuthRequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}
