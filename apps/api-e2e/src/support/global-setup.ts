import { execSync } from 'node:child_process';
import { PrismaClient, Role } from '@prisma/client';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import {
  E2E_DATABASE_URL,
  E2E_REDIS_URL,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
} from './env';

/**
 * Runs once per Jest invocation, before any spec file: makes sure the
 * dedicated e2e database exists and is migrated, wipes all data (database
 * tables + Redis db) for a deterministic run, and seeds the platform
 * SUPERADMIN — the only account that cannot be created through the API
 * (onboarding is invite-based, the first SUPERADMIN is provisioned manually).
 */
export default async function globalSetup(): Promise<void> {
  await ensureDatabaseExists();

  execSync('npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });

  const prisma = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });
  try {
    await truncateAllTables(prisma);
    await prisma.user.create({
      data: {
        email: SUPERADMIN_EMAIL,
        password: await bcrypt.hash(SUPERADMIN_PASSWORD, 10),
        name: 'E2E Superadmin',
        role: Role.SUPERADMIN,
        companyId: null,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  // Refresh tokens, jti denylist, and login-lockout counters live in Redis;
  // flush the e2e db so reruns never inherit lockouts or stale sessions.
  const redis = new Redis(E2E_REDIS_URL);
  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }
}

// NOTE: ensureDatabaseExists + truncateAllTables are mirrored in
// apps/web-e2e/src/support/start-api.cjs (raw-node Playwright webServer, no
// TS build, so it can't import this module). Keep the two copies in sync.
async function ensureDatabaseExists(): Promise<void> {
  const url = new URL(E2E_DATABASE_URL);
  const dbName = url.pathname.replace(/^\//, '');
  const adminUrl = new URL(E2E_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    if (!isDuplicateDatabaseError(error)) throw error;
  } finally {
    await admin.$disconnect();
  }
}

function isDuplicateDatabaseError(error: unknown): boolean {
  // Postgres 42P04 (duplicate_database), surfaced by Prisma as P2010.
  return error instanceof Error && error.message.includes('42P04');
}

async function truncateAllTables(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}
