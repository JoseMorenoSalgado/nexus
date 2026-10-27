-- Apply after verifying a backup.
CREATE INDEX `Property_tenantId_published_city_idx` ON `Property`(`tenantId`,`published`,`city`);
