-- Removes two pieces of dead schema:
--  * users.refreshToken — refresh tokens moved to Redis (refresh:<userId>:<sid>)
--    in the 2026-06 security hardening; the column was never read since.
--  * product_variants + stock_entries.variantId — the variants feature was
--    never implemented. variantId was always NULL, which also meant the
--    (productId, variantId, locationId) unique never deduplicated rows
--    (Postgres treats NULLs as distinct).

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_productId_fkey";

-- DropForeignKey
ALTER TABLE "stock_entries" DROP CONSTRAINT "stock_entries_variantId_fkey";

-- DropIndex
DROP INDEX "stock_entries_productId_variantId_locationId_key";

-- AlterTable
ALTER TABLE "stock_entries" DROP COLUMN "variantId";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "refreshToken";

-- DropTable
DROP TABLE "product_variants";

-- Defensive merge before the stricter unique: the old NULL-variant unique
-- allowed duplicate (productId, locationId) rows to slip in under
-- concurrency, so collapse any duplicates into a single summed entry.
WITH ranked AS (
  SELECT "id", "productId", "locationId",
         SUM("quantity") OVER (PARTITION BY "productId", "locationId") AS "totalQty",
         ROW_NUMBER()    OVER (PARTITION BY "productId", "locationId" ORDER BY "id") AS "rn"
  FROM "stock_entries"
)
UPDATE "stock_entries" se
SET "quantity" = r."totalQty"
FROM ranked r
WHERE se."id" = r."id" AND r."rn" = 1;

DELETE FROM "stock_entries" se
USING (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "productId", "locationId" ORDER BY "id") AS "rn"
  FROM "stock_entries"
) dup
WHERE se."id" = dup."id" AND dup."rn" > 1;

-- CreateIndex
CREATE UNIQUE INDEX "stock_entries_productId_locationId_key" ON "stock_entries"("productId", "locationId");
