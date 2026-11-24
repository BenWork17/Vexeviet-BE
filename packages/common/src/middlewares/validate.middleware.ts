import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../errors/app-error';

export interface RequestValidationSchemas {
  body?: ZodSchema<unknown>;
  query?: ZodSchema<unknown>;
  params?: ZodSchema<unknown>;
}

const formatZodIssues = (error: ZodError): Array<{ field: string; message: string }> =>
  error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

/**
 * Validates `req.body` (when passed a single ZodSchema) or `{ body, query, params }`.
 */
export function validateRequest(
  schemaOrGroup: ZodSchema<unknown> | RequestValidationSchemas
): (req: Request, res: Response, next: NextFunction) => void {
  const isSingleSchema = schemaOrGroup instanceof z.ZodType;

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (isSingleSchema) {
        req.body = schemaOrGroup.parse(req.body);
      } else {
        if (schemaOrGroup.body) {
          req.body = schemaOrGroup.body.parse(req.body);
        }
        if (schemaOrGroup.query) {
          req.query = schemaOrGroup.query.parse(req.query) as Request['query'];
        }
        if (schemaOrGroup.params) {
          req.params = schemaOrGroup.params.parse(req.params) as Request['params'];
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = formatZodIssues(error);
        next(new ValidationError(details[0]?.message || 'Validation failed', details));
        return;
      }
      next(error);
    }
  };
}

export const validateBody = <T>(
  schema: ZodSchema<T>
): ((req: Request, res: Response, next: NextFunction) => void) =>
  validateRequest({ body: schema });

export const validateQuery = <T>(
  schema: ZodSchema<T>
): ((req: Request, res: Response, next: NextFunction) => void) =>
  validateRequest({ query: schema });

export const validateParams = <T>(
  schema: ZodSchema<T>
): ((req: Request, res: Response, next: NextFunction) => void) =>
  validateRequest({ params: schema });
