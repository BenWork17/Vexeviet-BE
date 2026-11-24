export const authAndUserPaths = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        400: { description: 'Validation error' },
      },
    },
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'User login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        401: { description: 'Invalid credentials' },
      },
    },
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Refreshed token pair' },
        401: { description: 'Invalid or expired refresh token' },
      },
    },
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Revoke refresh token and logout',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Logged out' },
      },
    },
  },
  '/api/v1/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request password reset link (enumeration-safe)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Generic confirmation returned regardless of whether email exists',
        },
        400: { description: 'Invalid email format' },
      },
    },
  },
  '/api/v1/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password with one-time token and revoke active sessions',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token', 'newPassword'],
              properties: {
                token: { type: 'string', minLength: 1 },
                newPassword: {
                  type: 'string',
                  minLength: 8,
                  description: 'At least 8 chars, containing uppercase, lowercase, and digit',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Password reset succeeded' },
        400: { description: 'Invalid, expired, or already-used token, or weak password' },
      },
    },
  },
  '/api/v1/bus-templates': {
    get: {
      tags: ['Bus Templates'],
      summary: 'List active bus seat layout templates',
      responses: {
        200: {
          description: 'Bus templates list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/BusTemplate' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/users/admin/all': {
    get: {
      tags: ['Admin', 'Users'],
      summary: 'List all users (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['ADMIN', 'OPERATOR', 'CUSTOMER'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'] } },
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Paginated users' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/users/admin/{id}': {
    patch: {
      tags: ['Admin', 'Users'],
      summary: 'Update a user role or status (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              properties: {
                role: { type: 'string', enum: ['ADMIN', 'OPERATOR', 'CUSTOMER'] },
                status: { type: 'string', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'User updated' },
        400: { description: 'Invalid body' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
        404: { description: 'User not found' },
      },
    },
  },
  '/api/v1/audit-logs': {
    get: {
      tags: ['Audit Logs'],
      summary: 'List audit logs (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'actor', in: 'query', schema: { type: 'string' } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['INFO', 'WARNING', 'DANGER'] } },
        { name: 'action', in: 'query', schema: { type: 'string' } },
        { name: 'target', in: 'query', schema: { type: 'string' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Paginated audit logs' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
};
