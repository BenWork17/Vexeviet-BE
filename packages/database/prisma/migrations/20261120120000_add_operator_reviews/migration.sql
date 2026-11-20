-- CreateTable
CREATE TABLE `operator_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `operatorId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `status` ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
    `operatorReply` TEXT NULL,
    `repliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `operator_reviews_bookingId_key`(`bookingId`),
    INDEX `operator_reviews_operatorId_status_createdAt_idx`(`operatorId`, `status`, `createdAt`),
    INDEX `operator_reviews_userId_idx`(`userId`),
    INDEX `operator_reviews_operatorId_rating_idx`(`operatorId`, `rating`),
    INDEX `operator_reviews_routeId_idx`(`routeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `operator_reviews` ADD CONSTRAINT `operator_reviews_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operator_reviews` ADD CONSTRAINT `operator_reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operator_reviews` ADD CONSTRAINT `operator_reviews_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operator_reviews` ADD CONSTRAINT `operator_reviews_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
