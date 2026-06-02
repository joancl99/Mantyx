CREATE UNIQUE INDEX "inventory_count_lines_inventoryCountId_locationId_key"
ON "inventory_count_lines"("inventoryCountId", "locationId");
