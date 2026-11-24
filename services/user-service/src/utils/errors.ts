import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError } from '@vexeviet/common';

export { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError };

export class UserServiceError extends AppError {
  constructor(message: string, statusCode: number, code?: string) {
    super(message, statusCode, code || (statusCode === 404 ? 'NOT_FOUND' : 'USER_SERVICE_ERROR'));
  }
}
