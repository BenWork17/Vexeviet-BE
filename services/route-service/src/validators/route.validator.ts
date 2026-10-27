import { Request, Response, NextFunction } from 'express';
import { BusType, RouteStatus } from '../types';

interface CreateRouteBody {
  name: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  busType?: BusType;
  busTemplateId: string;
  /** Not part of the create contract; declared only so it can be rejected. */
  totalSeats?: unknown;
}

/**
 * Shape check only. Whether the template exists and is active is a database
 * question and is answered in `RouteService.create` — never here.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UpdateRouteBody {
  departureTime?: string;
  arrivalTime?: string;
  duration?: number;
  price?: number;
  busType?: BusType;
}

export const validateCreateRoute = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as CreateRouteBody;
  const { name, origin, destination, departureTime, arrivalTime, duration, price } = body;

  const errors: string[] = [];

  // `totalSeats` is not part of the create contract: total/available seats are
  // derived from the bus template and booking seats (see the schema comment on
  // `Route`). This validator does not reject unknown keys, so silently dropping
  // the old block would still let the field through to be ignored — reject it
  // instead, so the API stops accepting a field it cannot honour.
  if (body.totalSeats !== undefined) {
    errors.push(
      'totalSeats is not accepted: total seats derive from the bus template (busTemplateId)'
    );
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required');
  }
  if (!origin || typeof origin !== 'string' || origin.trim().length === 0) {
    errors.push('Origin is required');
  }
  if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
    errors.push('Destination is required');
  }
  if (!departureTime) {
    errors.push('Departure time is required');
  } else if (isNaN(Date.parse(departureTime))) {
    errors.push('Invalid departure time format');
  }
  if (!arrivalTime) {
    errors.push('Arrival time is required');
  } else if (isNaN(Date.parse(arrivalTime))) {
    errors.push('Invalid arrival time format');
  }
  if (departureTime && arrivalTime && new Date(departureTime) >= new Date(arrivalTime)) {
    errors.push('Departure time must be before arrival time');
  }
  if (duration === undefined || typeof duration !== 'number' || duration <= 0) {
    errors.push('Duration must be a positive number (in minutes)');
  }
  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('Price must be a non-negative number');
  }

  if (body.busType && !Object.values(BusType).includes(body.busType)) {
    errors.push(`Bus type must be one of: ${Object.values(BusType).join(', ')}`);
  }

  // Required: a route without a seat template cannot sell seats. Existence and
  // `isActive` are checked against the database in `RouteService.create`.
  if (body.busTemplateId === undefined || body.busTemplateId === null) {
    errors.push('busTemplateId is required');
  } else if (typeof body.busTemplateId !== 'string') {
    errors.push('busTemplateId must be a string');
  } else if (body.busTemplateId.trim().length === 0) {
    errors.push('busTemplateId must be a non-empty string');
  } else if (!UUID_PATTERN.test(body.busTemplateId)) {
    errors.push('busTemplateId must be a valid UUID');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next();
};

export const validateUpdateRoute = (req: Request, res: Response, next: NextFunction): void => {
  const body = req.body as UpdateRouteBody;
  const errors: string[] = [];

  if (body.departureTime && isNaN(Date.parse(body.departureTime))) {
    errors.push('Invalid departure time format');
  }
  if (body.arrivalTime && isNaN(Date.parse(body.arrivalTime))) {
    errors.push('Invalid arrival time format');
  }
  if (body.departureTime && body.arrivalTime) {
    if (new Date(body.departureTime) >= new Date(body.arrivalTime)) {
      errors.push('Departure time must be before arrival time');
    }
  }
  if (body.duration !== undefined && (typeof body.duration !== 'number' || body.duration <= 0)) {
    errors.push('Duration must be a positive number');
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
    errors.push('Price must be a non-negative number');
  }
  if (body.busType && !Object.values(BusType).includes(body.busType)) {
    errors.push(`Bus type must be one of: ${Object.values(BusType).join(', ')}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next();
};

/**
 * Query validation for `GET /routes/admin/all` (contract Shape 3).
 * Bad enum values are a 400 naming the offending field; `limit`/`page` are
 * clamped downstream so an out-of-range number is not an error.
 */
export const validateAdminRouteQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors: string[] = [];
  const { status, includeDeleted, operatorId, q } = req.query;

  if (status !== undefined && !Object.values(RouteStatus).includes(status as RouteStatus)) {
    errors.push(`status must be one of: ${Object.values(RouteStatus).join(', ')}`);
  }
  if (
    includeDeleted !== undefined &&
    typeof includeDeleted === 'string' &&
    !['true', 'false'].includes(includeDeleted)
  ) {
    errors.push('includeDeleted must be true or false');
  }
  if (operatorId !== undefined && typeof operatorId !== 'string') {
    errors.push('operatorId must be a string');
  }
  if (q !== undefined && typeof q !== 'string') {
    errors.push('q must be a string');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next();
};

/**
 * Query validation for `GET /routes/admin/operators` (contract Shape 3).
 */
export const validateAdminOperatorQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors: string[] = [];
  const { q } = req.query;

  if (q !== undefined && typeof q !== 'string') {
    errors.push('q must be a string');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next();
};
