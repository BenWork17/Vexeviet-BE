/*
  Warnings:

  - You are about to drop the column `userId` on the `routes` table. All the data in the column will be lost.
  - Added the required column `arrivalTime` to the `routes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departureTime` to the `routes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operatorId` to the `routes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `routes` DROP FOREIGN KEY `routes_userId_fkey`;

-- AlterTable
ALTER TABLE `routes` DROP COLUMN `userId`,
    ADD COLUMN `amenities` JSON NULL,
    ADD COLUMN `arrivalLocation` VARCHAR(191) NULL,
    ADD COLUMN `arrivalTime` DATETIME(3) NOT NULL,
    ADD COLUMN `availableSeats` INTEGER NOT NULL DEFAULT 45,
    ADD COLUMN `busType` ENUM('STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER') NOT NULL DEFAULT 'STANDARD',
    ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `departureLocation` VARCHAR(191) NULL,
    ADD COLUMN `departureTime` DATETIME(3) NOT NULL,
    ADD COLUMN `dropoffPoints` JSON NULL,
    ADD COLUMN `images` JSON NULL,
    ADD COLUMN `licensePlate` VARCHAR(191) NULL,
    ADD COLUMN `operatorId` VARCHAR(191) NOT NULL,
    ADD COLUMN `pickupPoints` JSON NULL,
    ADD COLUMN `policies` JSON NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `totalSeats` INTEGER NOT NULL DEFAULT 45,
    MODIFY `distance` DOUBLE NULL;

-- CreateIndex
CREATE INDEX `routes_origin_destination_idx` ON `routes`(`origin`, `destination`);

-- CreateIndex
CREATE INDEX `routes_departureTime_idx` ON `routes`(`departureTime`);

-- CreateIndex
CREATE INDEX `routes_status_idx` ON `routes`(`status`);

-- CreateIndex
CREATE INDEX `routes_operatorId_idx` ON `routes`(`operatorId`);

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
