import { AppError, createErrorHandler, notFoundHandler } from '@vexeviet/common';

export { AppError, notFoundHandler };
export const errorHandler = createErrorHandler('user-service');
