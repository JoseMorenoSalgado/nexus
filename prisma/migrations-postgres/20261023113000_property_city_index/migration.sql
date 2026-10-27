-- Apply after verifying a backup. Schedule maintenance for large tables.
CREATE INDEX "Property_tenantId_published_city_idx" ON "Property"("tenantId","published","city");
