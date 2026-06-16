import type { PrismaClient } from '@prisma/client';

/**
 * Create the dedicated e2e database if it does not exist yet.
 * @param databaseUrl Connection string pointing at the e2e database.
 */
export declare function ensureDatabaseExists(
  databaseUrl: string,
): Promise<void>;

/**
 * Truncate every public table except Prisma's migration ledger.
 * @param prisma Connected Prisma client for the e2e database.
 */
export declare function truncateAllTables(prisma: PrismaClient): Promise<void>;
