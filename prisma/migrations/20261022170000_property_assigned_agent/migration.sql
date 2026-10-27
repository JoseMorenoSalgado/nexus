ALTER TABLE `Property` ADD COLUMN `assignedAgentId` VARCHAR(191) NULL;
CREATE INDEX `Property_assignedAgentId_idx` ON `Property`(`assignedAgentId`);
ALTER TABLE `Property` ADD CONSTRAINT `Property_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
