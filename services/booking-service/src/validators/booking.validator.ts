import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Passenger schema
const passengerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  seatNumber: z.string().min(2).max(10),
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
export const createBookingSchema = z.any();

// Cancel booking request schema
export const cancelBookingSchema = z.any();

// Booking query schema
export const bookingQuerySchema = z.any();

// Seat availability request schema
export const seatAvailabilitySchema = z.any();

// Check seats request schema
export const checkSeatsSchema = z.any();

// Hold seats request schema
export const holdSeatsSchema = z.any();

// Validate seat numbers request schema
export const validateSeatsSchema = z.any();

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('[VALIDATION ERROR]', JSON.stringify(error.errors, null, 2));
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
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
