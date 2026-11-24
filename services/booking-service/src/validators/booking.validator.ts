import { z } from 'zod';
import { validateBody, validateQuery } from '@vexeviet/common';

const dateOnlyOrIsoSchema = z
  .string({ required_error: 'departureDate is required' })
  .min(1, 'departureDate is required')
  .refine((v) => !Number.isNaN(Date.parse(v)), {
    message: 'departureDate must be a valid date string',
  });

export const passengerSchema = z.object({
  firstName: z.string().trim().min(1, 'Passenger firstName is required').max(100),
  lastName: z.string().trim().max(100).default(''),
  seatNumber: z.string().trim().min(1, 'seatNumber is required').max(16),
  idNumber: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
});

export const contactInfoSchema = z.object({
  email: z.string().trim().email('Valid contact email is required'),
  phone: z.string().trim().min(8, 'Valid contact phone is required').max(25),
});

export const addonsSchema = z.object({
  insurance: z.boolean().optional(),
  meal: z.boolean().optional(),
  extraLuggage: z.boolean().optional(),
});

export const createBookingSchema = z
  .object({
    routeId: z.string({ required_error: 'routeId is required' }).uuid('routeId must be a valid UUID'),
    departureDate: dateOnlyOrIsoSchema,
    passengers: z.array(passengerSchema).min(1, 'At least one passenger is required').max(10),
    seats: z
      .array(z.string().trim().min(1))
      .min(1, 'At least one seat must be selected')
      .max(10, 'Maximum 10 seats per booking'),
    pickupPointId: z.string().trim().min(1, 'pickupPointId is required'),
    dropoffPointId: z.string().trim().min(1, 'dropoffPointId is required'),
    contactInfo: contactInfoSchema,
    addons: addonsSchema.optional(),
    promoCode: z.string().max(50).optional(),
    idempotencyKey: z.string().trim().min(1, 'idempotencyKey is required').max(128),
    notes: z.string().max(500).optional(),
  })
  .passthrough();

export const cancelBookingSchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
  })
  .optional()
  .default({});

export const bookingQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'departureDate', 'totalPrice']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const seatAvailabilitySchema = z.object({
  routeId: z.string({ required_error: 'routeId is required' }).uuid('routeId must be a valid UUID'),
  departureDate: dateOnlyOrIsoSchema,
});

export const checkSeatsSchema = z.object({
  routeId: z.string({ required_error: 'routeId is required' }).uuid('routeId must be a valid UUID'),
  departureDate: dateOnlyOrIsoSchema,
  seats: z.array(z.string().trim().min(1)).min(1, 'seats array must not be empty'),
});

export const holdSeatsSchema = z.object({
  routeId: z.string({ required_error: 'routeId is required' }).uuid('routeId must be a valid UUID'),
  departureDate: dateOnlyOrIsoSchema,
  seats: z.array(z.string().trim().min(1)).min(1, 'seats array must not be empty').max(10),
  ttlSeconds: z.number().int().positive().max(3600).optional(),
});

export const validateSeatsSchema = z.object({
  routeId: z.string({ required_error: 'routeId is required' }).uuid('routeId must be a valid UUID'),
  seats: z.array(z.string().trim().min(1)).min(1, 'seats array must not be empty'),
});

export { validateBody, validateQuery };
