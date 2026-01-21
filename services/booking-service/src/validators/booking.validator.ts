import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Passenger schema
const passengerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  seatNumber: z.string().min(2).max(5).regex(/^[A-D]\d{1,2}$/),
  idNumber: z.string().max(20).optional(),
  dateOfBirth: z.string().optional(),
});

// Contact info schema
const contactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10).max(20),
});

// Addons schema
const addonsSchema = z.object({
  insurance: z.boolean().optional(),
  meal: z.boolean().optional(),
  extraLuggage: z.boolean().optional(),
});

// Create booking request schema
export const createBookingSchema = z.object({
  routeId: z.string().uuid(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  passengers: z.array(passengerSchema).min(1).max(10),
  seats: z.array(z.string().regex(/^[A-D]\d{1,2}$/)).min(1).max(10),
  pickupPointId: z.string(),
  dropoffPointId: z.string(),
  contactInfo: contactInfoSchema,
  addons: addonsSchema.optional(),
  promoCode: z.string().max(50).optional(),
  idempotencyKey: z.string().uuid(),
  notes: z.string().max(500).optional(),
}).refine(data => data.passengers.length === data.seats.length, {
  message: 'Number of passengers must match number of seats',
  path: ['passengers'],
});

// Cancel booking request schema
export const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Booking query schema
export const bookingQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED']).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  sortBy: z.enum(['createdAt', 'departureDate', 'totalPrice']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Seat availability request schema
export const seatAvailabilitySchema = z.object({
  routeId: z.string().uuid(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Check seats request schema
export const checkSeatsSchema = z.object({
  routeId: z.string().uuid(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seats: z.array(z.string().regex(/^[A-D]\d{1,2}$/)).min(1).max(10),
});

// Hold seats request schema
export const holdSeatsSchema = z.object({
  routeId: z.string().uuid(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seats: z.array(z.string().regex(/^[A-D]\d{1,2}$/)).min(1).max(10),
  ttlSeconds: z.number().min(60).max(1800).optional(), // 1-30 minutes
});

// Validate seat numbers request schema
export const validateSeatsSchema = z.object({
  routeId: z.string().uuid(),
  seats: z.array(z.string()).min(1).max(10),
});

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(error);
    }
  };
}

// Validate query middleware factory
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
        return;
      }
      next(error);
    }
  };
}
