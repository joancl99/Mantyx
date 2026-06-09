import { CookieOptions, Response } from 'express';

/**
 * The refresh token is stored in an httpOnly cookie so it is never readable
 * from JavaScript (XSS cannot exfiltrate it). The path scopes it to the auth
 * routes that actually need it.
 */
export const REFRESH_COOKIE = 'refresh_token';

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_PATH = '/api/auth';

function baseOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  isProd: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(isProd),
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearRefreshCookie(res: Response, isProd: boolean): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions(isProd));
}
