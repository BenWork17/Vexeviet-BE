-- AlterTable
ALTER TABLE `routes` ADD COLUMN `busTemplateId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `bus_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `busType` ENUM('STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER') NOT NULL,
    `totalSeats` INTEGER NOT NULL,
    `floors` INTEGER NOT NULL DEFAULT 1,
    `rowsPerFloor` INTEGER NOT NULL,
    `columns` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `layoutImage` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bus_templates_busType_idx`(`busType`),
    INDEX `bus_templates_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seats` (
    `id` VARCHAR(191) NOT NULL,
    `busTemplateId` VARCHAR(191) NOT NULL,
    `seatNumber` VARCHAR(5) NOT NULL,
    `seatLabel` VARCHAR(10) NULL,
    `rowNumber` INTEGER NOT NULL,
    `columnPosition` VARCHAR(2) NOT NULL,
    `floor` INTEGER NOT NULL DEFAULT 1,
    `seatType` ENUM('NORMAL', 'VIP', 'SLEEPER', 'SEMI_SLEEPER') NOT NULL DEFAULT 'NORMAL',
    `position` ENUM('WINDOW', 'AISLE', 'MIDDLE') NOT NULL,
    `priceModifier` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `seats_busTemplateId_idx`(`busTemplateId`),
    INDEX `seats_floor_rowNumber_idx`(`floor`, `rowNumber`),
    INDEX `seats_seatType_idx`(`seatType`),
    INDEX `seats_isAvailable_idx`(`isAvailable`),
    UNIQUE INDEX `seats_busTemplateId_seatNumber_key`(`busTemplateId`, `seatNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `bookingCode` VARCHAR(10) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `departureDate` DATE NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `serviceFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paymentDeadline` DATETIME(3) NOT NULL,
    `pickupPointId` VARCHAR(191) NULL,
    `dropoffPointId` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(255) NOT NULL,
    `contactPhone` VARCHAR(20) NOT NULL,
    `promoCode` VARCHAR(50) NULL,
    `idempotencyKey` VARCHAR(100) NOT NULL,
    `notes` TEXT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_bookingCode_key`(`bookingCode`),
    UNIQUE INDEX `bookings_idempotencyKey_key`(`idempotencyKey`),
    INDEX `bookings_bookingCode_idx`(`bookingCode`),
    INDEX `bookings_userId_idx`(`userId`),
    INDEX `bookings_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `bookings_routeId_departureDate_idx`(`routeId`, `departureDate`),
    INDEX `bookings_idempotencyKey_idx`(`idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_passengers` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `seatId` VARCHAR(191) NULL,
    `firstName` VARCHAR(50) NOT NULL,
    `lastName` VARCHAR(50) NOT NULL,
    `seatNumber` VARCHAR(5) NOT NULL,
    `idNumber` VARCHAR(20) NULL,
    `dateOfBirth` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_passengers_bookingId_idx`(`bookingId`),
    INDEX `booking_passengers_seatId_idx`(`seatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_seats` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `seatId` VARCHAR(191) NULL,
    `departureDate` DATE NOT NULL,
    `seatNumber` VARCHAR(5) NOT NULL,
    `status` ENUM('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED') NOT NULL DEFAULT 'HELD',
    `lockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedUntil` DATETIME(3) NOT NULL,
    `price` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `booking_seats_routeId_departureDate_seatNumber_idx`(`routeId`, `departureDate`, `seatNumber`),
    INDEX `booking_seats_status_idx`(`status`),
    INDEX `booking_seats_bookingId_idx`(`bookingId`),
    INDEX `booking_seats_seatId_idx`(`seatId`),
    INDEX `booking_seats_lockedUntil_idx`(`lockedUntil`),
    UNIQUE INDEX `booking_seats_routeId_departureDate_seatNumber_key`(`routeId`, `departureDate`, `seatNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `routes_busTemplateId_idx` ON `routes`(`busTemplateId`);

-- AddForeignKey
ALTER TABLE `seats` ADD CONSTRAINT `seats_busTemplateId_fkey` FOREIGN KEY (`busTemplateId`) REFERENCES `bus_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_busTemplateId_fkey` FOREIGN KEY (`busTemplateId`) REFERENCES `bus_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_passengers` ADD CONSTRAINT `booking_passengers_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_passengers` ADD CONSTRAINT `booking_passengers_seatId_fkey` FOREIGN KEY (`seatId`) REFERENCES `seats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_seats` ADD CONSTRAINT `booking_seats_seatId_fkey` FOREIGN KEY (`seatId`) REFERENCES `seats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
