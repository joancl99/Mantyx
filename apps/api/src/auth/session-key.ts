/**
 * Redis key for a single login session's hashed refresh token. Keying by
 * `sid` (session id) instead of by user alone lets concurrent sessions on
 * different devices coexist — a second login no longer overwrites the first.
 * Logout and refresh rotation target one session via its `sid`.
 */
export function refreshKey(userId: string, sessionId: string): string {
  return `refresh:${userId}:${sessionId}`;
}
