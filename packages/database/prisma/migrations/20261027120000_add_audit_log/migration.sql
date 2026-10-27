-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(64) NULL,
    `actorName` VARCHAR(160) NOT NULL,
    `actorRole` VARCHAR(20) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `target` VARCHAR(160) NOT NULL,
    `targetId` VARCHAR(64) NULL,
    `severity` ENUM('INFO', 'WARNING', 'DANGER') NOT NULL DEFAULT 'INFO',
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_severity_idx`(`severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
