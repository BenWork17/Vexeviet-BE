export const bookingAndSeatPaths = {
  '/api/v1/bookings': {
    post: {
      tags: ['Bookings'],
      summary: 'Create a new booking',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: [
                'routeId',
                'departureDate',
                'seats',
                'passengers',
                'pickupPointId',
                'dropoffPointId',
                'contactInfo',
                'idempotencyKey',
              ],
              properties: {
                routeId: { type: 'string', format: 'uuid' },
                departureDate: { type: 'string', format: 'date' },
                seats: { type: 'array', items: { type: 'string' } },
                passengers: { type: 'array', items: { type: 'object' } },
                pickupPointId: { type: 'string' },
                dropoffPointId: { type: 'string' },
                contactInfo: { type: 'object' },
                addons: { type: 'object' },
                promoCode: { type: 'string' },
                idempotencyKey: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Booking created successfully' },
        401: { description: 'Unauthorized' },
        404: { description: 'Route not found' },
        409: { description: 'Seats unavailable / Conflict' },
      },
    },
  },
  '/api/v1/bookings/my': {
    get: {
      tags: ['Bookings'],
      summary: "Get current user's bookings",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'] } },
        { name: 'fromDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'toDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      responses: {
        200: { description: 'Paginated list of bookings' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/bookings/code/{code}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking by booking code',
      parameters: [
        { name: 'code', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Booking detail' },
        404: { description: 'Booking not found' },
      },
    },
  },
  '/api/v1/bookings/{id}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Booking detail' },
        401: { description: 'Unauthorized' },
        404: { description: 'Booking not found' },
      },
    },
  },
  '/api/v1/bookings/{id}/cancel': {
    post: {
      tags: ['Bookings'],
      summary: 'Cancel a booking',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Booking cancelled successfully' },
        401: { description: 'Unauthorized' },
        404: { description: 'Booking not found' },
        409: { description: 'Cannot cancel' },
      },
    },
  },
  '/api/v1/bookings/{id}/confirm': {
    post: {
      tags: ['Bookings'],
      summary: 'Confirm a booking (internal API after payment)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'x-internal-api-key', in: 'header', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Booking confirmed' },
        401: { description: 'Invalid internal API key' },
        404: { description: 'Booking not found' },
      },
    },
  },
  '/api/v1/bookings/admin/all': {
    get: {
      tags: ['Admin', 'Bookings'],
      summary: 'List all bookings (admin/operator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'paymentStatus', in: 'query', schema: { type: 'string' } },
        { name: 'operatorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'q', in: 'query', schema: { type: 'string' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'sort', in: 'query', schema: { type: 'string', default: '-createdAt' } },
      ],
      responses: {
        200: { description: 'Paginated admin bookings' },
      },
    },
  },
  '/api/v1/bookings/admin/dashboard': {
    get: {
      tags: ['Admin', 'Bookings'],
      summary: 'Booking dashboard aggregates (admin/operator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 7, minimum: 1, maximum: 90 } },
      ],
      responses: {
        200: { description: 'Dashboard aggregates' },
      },
    },
  },
  '/api/v1/seats/availability': {
    get: {
      tags: ['Seats'],
      summary: 'Get seat availability for a route',
      parameters: [
        { name: 'routeId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'departureDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
      ],
      responses: {
        200: {
          description: 'Seat availability',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SeatAvailability' },
            },
          },
        },
      },
    },
  },
  '/api/v1/seats/check': {
    post: {
      tags: ['Seats'],
      summary: 'Check if specific seats are available',
      responses: { 200: { description: 'Seat check result' } },
    },
  },
  '/api/v1/seats/hold': {
    post: {
      tags: ['Seats'],
      summary: 'Temporarily hold seats',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Seats held successfully' } },
    },
  },
  '/api/v1/seats/release': {
    post: {
      tags: ['Seats'],
      summary: 'Release held seats',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Seats released' } },
    },
  },
  '/api/v1/seats/validate': {
    post: {
      tags: ['Seats'],
      summary: 'Validate seat numbers for a route',
      responses: { 200: { description: 'Validation result' } },
    },
  },
};
