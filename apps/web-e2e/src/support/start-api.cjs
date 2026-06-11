'use strict';

/**
 * Playwright webServer command for the API. Playwright starts web servers
 * BEFORE globalSetup runs, so the database preparation has to happen here:
 * make sure the dedicated e2e database exists and is migrated, wipe it and
 * the e2e Redis db for a deterministic run, seed the accounts the browser
 * flows log in with, then build and start the real API on port 3000 (the
 * dev web build points its apiUrl at http://localhost:3000/api).
 *
 * Same isolation rules as apps/api-e2e: DATABASE_URL/REDIS_URL are always
 * forced to e2e targets (database warehouse_e2e, Redis db 1) so the
 * destructive reset can never touch the dev infrastructure.
 */
const { execSync, spawn } = require('node:child_process');

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://warehouse:warehouse@localhost:5432/warehouse_e2e';
const E2E_REDIS_URL =
  process.env.E2E_REDIS_URL ?? 'redis://:warehouse@localhost:6379/1';

process.env.DATABASE_URL = E2E_DATABASE_URL;
process.env.REDIS_URL = E2E_REDIS_URL;
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.CORS_ORIGIN = 'http://localhost:4200';
process.env.JWT_ACCESS_SECRET ??=
  'e2e-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??=
  'e2e-refresh-secret-0123456789abcdef0123456789abcdef';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const Redis = require('ioredis');

const SEED = {
  superadmin: { email: 'superadmin@web-e2e.test', password: 'Super-Pass123!' },
  admin: { email: 'admin@web-e2e.test', password: 'Admin-Pass123!' },
  viewer: { email: 'viewer@web-e2e.test', password: 'Viewer-Pass123!' },
  company: { name: 'E2E Web Corp', slug: 'e2e-web-corp' },
  category: 'Categoría E2E',
};

async function main() {
  await ensureDatabaseExists();
  execSync('npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env,
  });

  const prisma = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });
  try {
    await truncateAllTables(prisma);
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }

  const redis = new Redis(E2E_REDIS_URL);
  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }

  execSync('npx nx build api', { stdio: 'inherit', env: process.env });

  const api = spawn(process.execPath, ['dist/apps/api/main.js'], {
    stdio: 'inherit',
    env: process.env,
  });
  api.on('exit', (code) => process.exit(code ?? 0));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => api.kill('SIGTERM'));
  }
}

async function ensureDatabaseExists() {
  const dbName = new URL(E2E_DATABASE_URL).pathname.replace(/^\//, '');
  const adminUrl = new URL(E2E_DATABASE_URL);
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

async function truncateAllTables(prisma) {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

async function seed(prisma) {
  const hash = (password) => bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email: SEED.superadmin.email,
      password: await hash(SEED.superadmin.password),
      name: 'E2E Superadmin',
      role: 'SUPERADMIN',
      companyId: null,
    },
  });

  const company = await prisma.company.create({
    data: { name: SEED.company.name, slug: SEED.company.slug },
  });

  await prisma.user.create({
    data: {
      email: SEED.admin.email,
      password: await hash(SEED.admin.password),
      name: 'E2E Admin',
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  await prisma.user.create({
    data: {
      email: SEED.viewer.email,
      password: await hash(SEED.viewer.password),
      name: 'E2E Viewer',
      role: 'VIEWER',
      companyId: company.id,
    },
  });

  // The product-creation flow needs an existing category to pick.
  await prisma.category.create({
    data: { name: SEED.category, companyId: company.id },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
