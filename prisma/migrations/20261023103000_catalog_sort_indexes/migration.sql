-- Apply after verifying a database backup. These indexes support published tenant-scoped listing pagination and sort.
CREATE INDEX `Property_tenantId_published_createdAt_id_idx` ON `Property`(`tenantId`,`published`,`createdAt`,`id`);
CREATE INDEX `Property_tenantId_published_price_id_idx` ON `Property`(`tenantId`,`published`,`price`,`id`);
