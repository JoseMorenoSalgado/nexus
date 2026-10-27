-- Apply after verifying a database backup. Run during a maintenance window for large production tables.
CREATE INDEX "Property_tenantId_published_createdAt_id_idx" ON "Property"("tenantId","published","createdAt","id");
CREATE INDEX "Property_tenantId_published_price_id_idx" ON "Property"("tenantId","published","price","id");
