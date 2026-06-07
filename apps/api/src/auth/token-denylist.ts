/**
 * Redis key for a revoked access token. A token whose `jti` has an entry here
 * is rejected by the JWT strategy even though its signature is still valid,
 * which lets logout invalidate an access token before its natural expiry.
 */
export function denylistKey(jti: string): string {
  return `denylist:access:${jti}`;
}
