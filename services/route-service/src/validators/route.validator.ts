import { Request, Response, NextFunction } from 'express';
import { BusType } from '../types';

interface CreateRouteBody {
  name: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  price: number;
  busType?: BusType;
  totalSeats?: number;
}

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

  if (body.totalSeats !== undefined) {
    if (typeof body.totalSeats !== 'number' || body.totalSeats <= 0) {
      errors.push('Total seats must be a positive number');
    }
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
