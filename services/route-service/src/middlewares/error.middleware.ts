import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  createErrorHandler,
  notFoundHandler,
} from '@vexeviet/common';

export {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  notFoundHandler,
};

export const errorHandler = createErrorHandler('route-service');
