import { z } from 'zod';

/** Admin user list query. All filters are optional; unknown keys are ignored. */
export const adminUserListQuerySchema = z.object({
  role: z.enum(['ADMIN', 'OPERATOR', 'CUSTOMER'], {
    errorMap: () => ({ message: 'role must be one of ADMIN, OPERATOR, CUSTOMER' }),
  }).optional(),
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'], {
    errorMap: () => ({
      message: 'status must be one of PENDING_VERIFICATION, ACTIVE, SUSPENDED, DELETED',
    }),
  }).optional(),
  q: z.string().trim().max(100, 'q must not exceed 100 characters').optional(),
  page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').default(20),
});

/** Admin user update body: at least one of role/status is required. */
export const adminUserUpdateSchema = z
  .object({
    role: z.enum(['ADMIN', 'OPERATOR', 'CUSTOMER'], {
      errorMap: () => ({ message: 'role must be one of ADMIN, OPERATOR, CUSTOMER' }),
    }).optional(),
    status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'], {
      errorMap: () => ({
        message: 'status must be one of PENDING_VERIFICATION, ACTIVE, SUSPENDED, DELETED',
      }),
    }).optional(),
  })
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: 'At least one of role or status is required',
  });

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserUpdateBody = z.infer<typeof adminUserUpdateSchema>;
