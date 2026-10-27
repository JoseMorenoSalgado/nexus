-- Run only once after verified backup and existing CommercialClosing migration.
CREATE TABLE `CommissionPayment` (
 `id` VARCHAR(191) NOT NULL,
 `tenantId` VARCHAR(191) NOT NULL,
 `closingId` VARCHAR(191) NOT NULL,
 `amount` DECIMAL(13,2) NOT NULL,
 `paidAt` DATETIME(3) NOT NULL,
 `method` VARCHAR(191) NOT NULL DEFAULT 'transferencia',
 `reference` VARCHAR(191) NULL,
 `notes` TEXT NULL,
 `createdByName` VARCHAR(191) NOT NULL,
 `status` VARCHAR(191) NOT NULL DEFAULT 'confirmado',
 `voidReason` TEXT NULL,
 `voidedAt` DATETIME(3) NULL,
 `voidedByName` VARCHAR(191) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`),
 INDEX `CommissionPayment_tenantId_closingId_paidAt_idx`(`tenantId`,`closingId`,`paidAt`),
 INDEX `CommissionPayment_tenantId_paidAt_idx`(`tenantId`,`paidAt`),
 CONSTRAINT `CommissionPayment_closingId_fkey` FOREIGN KEY (`closingId`) REFERENCES `CommercialClosing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
