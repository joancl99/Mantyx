/**
 * E2E environment. Imported before the API's AppModule is created (and by the
 * Jest global setup) so `process.env` is populated before @nestjs/config
 * validates it — real environment variables take precedence over the values
 * in `apps/api/.env`.
 *
 * DATABASE_URL and REDIS_URL are always forced to dedicated e2e targets
 * (database `warehouse_e2e`, Redis db 1): the global setup truncates the
 * database and flushes the Redis db on every run, so they must never point
 * at the dev infrastructure. Override the targets with E2E_DATABASE_URL /
 * E2E_REDIS_URL (used by CI, where Redis runs without a password).
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://warehouse:warehouse@localhost:5432/warehouse_e2e';

export const E2E_REDIS_URL =
  process.env.E2E_REDIS_URL ?? 'redis://:warehouse@localhost:6379/1';

process.env.DATABASE_URL = E2E_DATABASE_URL;
process.env.REDIS_URL = E2E_REDIS_URL;
process.env.NODE_ENV = 'test';

// Test-only secrets (≥32 chars for the Joi validation). Local runs may also
// pick up the real dev secrets from apps/api/.env via @nestjs/config, but
// these guarantee the app boots where no .env exists (CI).
process.env.JWT_ACCESS_SECRET ??=
  'e2e-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??=
  'e2e-refresh-secret-0123456789abcdef0123456789abcdef';

export const SUPERADMIN_EMAIL = 'superadmin@e2e.test';
export const SUPERADMIN_PASSWORD = 'SuperAdmin123!';
