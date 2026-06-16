'use strict';

/**
 * Shared end-to-end database plumbing, consumed by BOTH e2e projects:
 *   - apps/api-e2e/src/support/global-setup.ts  (Jest globalSetup, TypeScript)
 *   - apps/web-e2e/src/support/start-api.cjs     (Playwright webServer, raw node)
 *
 * It lives in tools/ (outside both Nx projects) and is plain CommonJS so the
 * raw-node web-e2e webServer can require it without a TypeScript build, while
 * api-e2e imports it through ts-jest. Pure DB plumbing only — each caller
 * still owns its own seed data, since the api and browser suites seed
 * different accounts.
 */

const { PrismaClient } = require('@prisma/client');

/**
 * Create the dedicated e2e database if it does not exist yet. Connects to the
 * server's default `postgres` database to issue the CREATE.
 * @param {string} databaseUrl Connection string pointing at the e2e database.
 * @returns {Promise<void>}
 */
async function ensureDatabaseExists(databaseUrl) {
  const dbName = new URL(databaseUrl).pathname.replace(/^\//, '');
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    // Postgres 42P04 (duplicate_database) means it is already there.
    if (!(error instanceof Error && error.message.includes('42P04'))) {
      throw error;
    }
  } finally {
    await admin.$disconnect();
  }
}

/**
 * Truncate every public table except Prisma's migration ledger so each run
 * starts from a clean, deterministic state.
 * @param {import('@prisma/client').PrismaClient} prisma Connected client.
 * @returns {Promise<void>}
 */
async function truncateAllTables(prisma) {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

module.exports = { ensureDatabaseExists, truncateAllTables };
