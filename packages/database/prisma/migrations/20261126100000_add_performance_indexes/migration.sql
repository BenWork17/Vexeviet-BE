-- Add composite and sort indexes for production scale (5K+ users, 10K+ bookings/payments)

CREATE INDEX `users_role_status_createdAt_idx` ON `users`(`role`, `status`, `createdAt`);
CREATE INDEX `users_createdAt_idx` ON `users`(`createdAt`);

CREATE INDEX `routes_status_departureTime_idx` ON `routes`(`status`, `departureTime`);
CREATE INDEX `routes_status_createdAt_idx` ON `routes`(`status`, `createdAt`);
CREATE INDEX `routes_operatorId_status_createdAt_idx` ON `routes`(`operatorId`, `status`, `createdAt`);

CREATE INDEX `bookings_createdAt_idx` ON `bookings`(`createdAt`);
CREATE INDEX `bookings_departureDate_idx` ON `bookings`(`departureDate`);
CREATE INDEX `bookings_status_paymentDeadline_idx` ON `bookings`(`status`, `paymentDeadline`);

CREATE INDEX `booking_seats_status_lockedUntil_idx` ON `booking_seats`(`status`, `lockedUntil`);
CREATE INDEX `booking_seats_routeId_status_departureDate_idx` ON `booking_seats`(`routeId`, `status`, `departureDate`);

CREATE INDEX `payments_bookingId_createdAt_idx` ON `payments`(`bookingId`, `createdAt`);
CREATE INDEX `payments_status_createdAt_idx` ON `payments`(`status`, `createdAt`);
