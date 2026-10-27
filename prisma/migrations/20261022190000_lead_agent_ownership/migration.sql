-- Run once after a verified database backup and after the previous property-agent migration.
ALTER TABLE `Lead` ADD COLUMN `assignedAgentId` VARCHAR(191) NULL;
-- Preserve the current responsible agent for existing contacts; later property reassignments no longer move these leads.
UPDATE `Lead` AS l
INNER JOIN `Property` AS p ON p.id=l.propertyId AND p.tenantId=l.tenantId
INNER JOIN `AdminUser` AS u ON u.id=p.assignedAgentId AND u.tenantId=l.tenantId
SET l.assignedAgentId=u.id
WHERE l.assignedAgentId IS NULL;
CREATE INDEX `Lead_tenantId_assignedAgentId_createdAt_idx` ON `Lead`(`tenantId`,`assignedAgentId`,`createdAt`);
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE `LeadAssignmentHistory` (
 `id` VARCHAR(191) NOT NULL,
 `tenantId` VARCHAR(191) NOT NULL,
 `leadId` VARCHAR(191) NOT NULL,
 `fromAgentId` VARCHAR(191) NULL,
 `fromAgentName` VARCHAR(191) NULL,
 `toAgentId` VARCHAR(191) NULL,
 `toAgentName` VARCHAR(191) NULL,
 `changedByName` VARCHAR(191) NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX `LeadAssignmentHistory_tenantId_leadId_createdAt_idx`(`tenantId`,`leadId`,`createdAt`),
 PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `LeadAssignmentHistory` ADD CONSTRAINT `LeadAssignmentHistory_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
