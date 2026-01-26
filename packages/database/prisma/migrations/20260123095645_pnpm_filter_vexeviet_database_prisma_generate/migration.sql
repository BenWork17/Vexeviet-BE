/*
  Warnings:

  - You are about to drop the column `availableSeats` on the `routes` table. All the data in the column will be lost.
  - You are about to drop the column `totalSeats` on the `routes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `booking_seats` ADD COLUMN `holdId` VARCHAR(36) NULL,
    MODIFY `bookingId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `routes` DROP COLUMN `availableSeats`,
    DROP COLUMN `totalSeats`,
    ADD COLUMN `busId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `buses` (
    `id` VARCHAR(191) NOT NULL,
    `licensePlate` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `busTemplateId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'MAINTENANCE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `buses_licensePlate_key`(`licensePlate`),
    INDEX `buses_operatorId_idx`(`operatorId`),
    INDEX `buses_busTemplateId_idx`(`busTemplateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `booking_seats_holdId_idx` ON `booking_seats`(`holdId`);

-- AddForeignKey
ALTER TABLE `buses` ADD CONSTRAINT `buses_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `buses` ADD CONSTRAINT `buses_busTemplateId_fkey` FOREIGN KEY (`busTemplateId`) REFERENCES `bus_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_busId_fkey` FOREIGN KEY (`busId`) REFERENCES `buses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
