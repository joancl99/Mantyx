import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty({ nullable: true }) companyId: string | null;
}

/** Internal result of the auth service — the refresh token is set as an
 * httpOnly cookie by the controller and never returned in the response body. */
export class AuthTokensDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}

/** Login/register response body (no refresh token — it lives in the cookie). */
export class AuthSessionDto {
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}

/** Refresh response body. */
export class AccessTokenDto {
  @ApiProperty() accessToken: string;
}
