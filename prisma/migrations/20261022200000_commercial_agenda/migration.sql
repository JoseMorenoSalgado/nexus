-- Apply once to an existing MariaDB schema after backing up and reconciling prior migrations.
CREATE TABLE `AgendaEvent` (
 `id` VARCHAR(191) NOT NULL,
 `tenantId` VARCHAR(191) NOT NULL,
 `leadId` VARCHAR(191) NOT NULL,
 `type` VARCHAR(191) NOT NULL,
 `title` VARCHAR(191) NOT NULL,
 `startsAt` DATETIME(3) NOT NULL,
 `durationMinutes` INTEGER NOT NULL DEFAULT 60,
 `location` VARCHAR(191) NULL,
 `notes` TEXT NULL,
 `status` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
 `createdByName` VARCHAR(191) NOT NULL,
 `completedAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `updatedAt` DATETIME(3) NOT NULL,
 INDEX `AgendaEvent_tenantId_startsAt_idx`(`tenantId`,`startsAt`),
 INDEX `AgendaEvent_tenantId_leadId_startsAt_idx`(`tenantId`,`leadId`,`startsAt`),
 PRIMARY KEY (`id`),
 CONSTRAINT `AgendaEvent_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
