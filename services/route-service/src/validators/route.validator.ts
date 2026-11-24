import { z } from 'zod';
import { ValidationError } from '@vexeviet/common';
import type { Request, Response, NextFunction } from 'express';
import { BusType, RouteStatus } from '../types';

const isoDateString = z
  .string({ required_error: 'Date/time is required' })
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date/time format' });

export const createRouteSchema = z
  .object({
    name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
    origin: z.string({ required_error: 'Origin is required' }).trim().min(1, 'Origin is required'),
    destination: z
      .string({ required_error: 'Destination is required' })
      .trim()
      .min(1, 'Destination is required'),
    departureLocation: z.string().optional().nullable(),
    arrivalLocation: z.string().optional().nullable(),
    departureTime: isoDateString,
    arrivalTime: isoDateString,
    duration: z
      .number({ required_error: 'Duration is required' })
      .positive('Duration must be a positive number (in minutes)'),
    price: z
      .number({ required_error: 'Price is required' })
      .min(0, 'Price must be a non-negative number'),
    busType: z.nativeEnum(BusType).optional(),
    busTemplateId: z
      .string({ required_error: 'busTemplateId is required' })
      .uuid('busTemplateId must be a valid UUID'),
    amenities: z.unknown().optional(),
    pickupPoints: z.unknown().optional(),
    dropoffPoints: z.unknown().optional(),
    policies: z.unknown().optional(),
    images: z.unknown().optional(),
    totalSeats: z.undefined({
      invalid_type_error:
        'totalSeats is not accepted: total seats derive from the bus template (busTemplateId)',
    }),
  })
  .superRefine((val, ctx) => {
    if (new Date(val.departureTime) >= new Date(val.arrivalTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['arrivalTime'],
        message: 'Departure time must be before arrival time',
      });
    }
  });

export const updateRouteSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    origin: z.string().trim().min(1).optional(),
    destination: z.string().trim().min(1).optional(),
    departureLocation: z.string().optional().nullable(),
    arrivalLocation: z.string().optional().nullable(),
    departureTime: isoDateString.optional(),
    arrivalTime: isoDateString.optional(),
    duration: z.number().positive('Duration must be a positive number').optional(),
    price: z.number().min(0, 'Price must be a non-negative number').optional(),
    busType: z.nativeEnum(BusType).optional(),
    busTemplateId: z.string().uuid('busTemplateId must be a valid UUID').optional(),
    status: z.nativeEnum(RouteStatus).optional(),
    amenities: z.unknown().optional(),
    pickupPoints: z.unknown().optional(),
    dropoffPoints: z.unknown().optional(),
    policies: z.unknown().optional(),
    images: z.unknown().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.departureTime && val.arrivalTime && new Date(val.departureTime) >= new Date(val.arrivalTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['arrivalTime'],
        message: 'Departure time must be before arrival time',
      });
    }
  });

export const adminRouteQuerySchema = z.object({
  status: z.nativeEnum(RouteStatus).optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
  operatorId: z.string().optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const adminOperatorQuerySchema = z.object({
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

function toZodMiddleware(schema: z.ZodSchema, source: 'body' | 'query') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      next(new ValidationError(details[0]?.message || 'Validation failed', details));
      return;
    }
    next();
  };
}

export const validateCreateRoute = toZodMiddleware(createRouteSchema, 'body');
export const validateUpdateRoute = toZodMiddleware(updateRouteSchema, 'body');
export const validateAdminRouteQuery = toZodMiddleware(adminRouteQuerySchema, 'query');
export const validateAdminOperatorQuery = toZodMiddleware(adminOperatorQuerySchema, 'query');
