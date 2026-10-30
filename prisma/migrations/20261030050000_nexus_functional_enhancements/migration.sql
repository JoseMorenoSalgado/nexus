-- Additive only. Apply after a verified SQL backup and before enabling the new app version.
-- Previous Property.refCode values are not touched.
CREATE TABLE `PropertySequence` (
  `tenantId` VARCHAR(191) NOT NULL,
  `prefix` VARCHAR(191) NOT NULL DEFAULT 'NRE',
  `nextNumber` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`tenantId`),
  CONSTRAINT `PropertySequence_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `LeadSource` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `LeadSource_tenantId_code_key`(`tenantId`,`code`),
  INDEX `LeadSource_tenantId_active_idx`(`tenantId`,`active`),
  CONSTRAINT `LeadSource_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `LeadPropertyHistory` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `leadId` VARCHAR(191) NOT NULL,
  `fromPropertyId` VARCHAR(191) NULL,
  `fromRef` VARCHAR(191) NULL,
  `fromExternalDescription` VARCHAR(300) NULL,
  `toPropertyId` VARCHAR(191) NULL,
  `toRef` VARCHAR(191) NULL,
  `externalDescription` VARCHAR(300) NULL,
  `changedByName` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `LeadPropertyHistory_tenantId_leadId_createdAt_idx`(`tenantId`,`leadId`,`createdAt`),
  CONSTRAINT `LeadPropertyHistory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LeadPropertyHistory_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Lead` ADD COLUMN `externalPropertyInterest` VARCHAR(300) NULL;
