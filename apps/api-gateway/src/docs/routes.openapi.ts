export const routePaths = {
  '/api/v1/search/routes': {
    get: {
      tags: ['Search'],
      summary: 'Search active routes by criteria',
      parameters: [
        { name: 'origin', in: 'query', schema: { type: 'string' } },
        { name: 'destination', in: 'query', schema: { type: 'string' } },
        { name: 'departureDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'busType', in: 'query', schema: { type: 'string', enum: ['STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER'] } },
        { name: 'minPrice', in: 'query', schema: { type: 'number' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Route' } },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/routes/{id}': {
    get: {
      tags: ['Routes'],
      summary: 'Get route detail by ID',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Route detail' },
        404: { description: 'Route not found' },
      },
    },
  },
  '/api/v1/routes/admin/all': {
    get: {
      tags: ['Admin', 'Routes'],
      summary: 'List all routes (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] } },
        { name: 'operatorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        { name: 'includeDeleted', in: 'query', schema: { type: 'boolean', default: false } },
      ],
      responses: {
        200: { description: 'Paginated admin routes' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/routes/admin/operators': {
    get: {
      tags: ['Admin', 'Routes'],
      summary: 'List operator aggregates (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Paginated operator aggregates' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
};
