import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VeXeViet API',
      version: '1.0.0',
      description: 'Vietnamese Bus Ticket Booking Platform API',
      contact: {
        name: 'VeXeViet Team',
        email: 'support@vexeviet.vn',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server (API Gateway)',
      },
      {
        url: 'http://localhost:8000',
        description: 'Production API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            fullName: { type: 'string' },
            avatar: { type: 'string', nullable: true },
            verified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 8, example: 'Password123!' },
            fullName: { type: 'string', example: 'Nguyen Van A' },
            phone: { type: 'string', example: '0901234567' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'Password123!' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number', example: 900 },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },
        Route: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            operatorId: { type: 'string', format: 'uuid' },
            fromCity: { type: 'string', example: 'Hồ Chí Minh' },
            toCity: { type: 'string', example: 'Hà Nội' },
            departureTime: { type: 'string', format: 'date-time' },
            arrivalTime: { type: 'string', format: 'date-time' },
            price: { type: 'number', example: 450000 },
            busType: { type: 'string', enum: ['STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER'] },
            totalSeats: { type: 'integer', example: 45 },
          },
        },
        SearchRequest: {
          type: 'object',
          required: ['fromCity', 'toCity', 'departureDate'],
          properties: {
            fromCity: { type: 'string', example: 'Hồ Chí Minh' },
            toCity: { type: 'string', example: 'Hà Nội' },
            departureDate: { type: 'string', format: 'date', example: '2026-02-15' },
            busType: { type: 'string', enum: ['STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER'] },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20 },
          },
        },
        BusTemplate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Limousine 34 chỗ' },
            busType: { type: 'string', enum: ['STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER'] },
            totalSeats: { type: 'integer', example: 34 },
            floors: { type: 'integer', example: 1 },
            rowsPerFloor: { type: 'integer', example: 9 },
            columns: { type: 'string', example: 'A,B,_,C,D' },
          },
        },
        SeatAvailability: {
          type: 'object',
          properties: {
            routeId: { type: 'string', format: 'uuid' },
            departureDate: { type: 'string', format: 'date' },
            totalSeats: { type: 'integer' },
            availableSeats: { type: 'integer' },
            seats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  seatNumber: { type: 'string', example: 'A1' },
                  status: { type: 'string', enum: ['AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED'] },
                  seatType: { type: 'string', enum: ['NORMAL', 'VIP', 'SLEEPER'] },
                  price: { type: 'number' },
                },
              },
            },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            bookingCode: { type: 'string', example: 'VXV123456' },
            userId: { type: 'string', format: 'uuid' },
            routeId: { type: 'string', format: 'uuid' },
            departureDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
            totalPrice: { type: 'number' },
            seats: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateBookingRequest: {
          type: 'object',
          required: ['routeId', 'departureDate', 'seatNumbers', 'passengers'],
          properties: {
            routeId: { type: 'string', format: 'uuid' },
            departureDate: { type: 'string', format: 'date', example: '2026-02-15' },
            seatNumbers: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2'] },
            passengers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string' },
                  seatNumber: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Bus Templates', description: 'Bus layout templates' },
      { name: 'Routes', description: 'Route management' },
      { name: 'Search', description: 'Route search' },
      { name: 'Seats', description: 'Seat availability' },
      { name: 'Bookings', description: 'Booking management' },
    ],
  },
  apis: [], // We'll define paths inline
};

export const swaggerSpec = swaggerJsdoc(options) as Record<string, unknown>;

// Add paths manually since we're proxying to other services
(swaggerSpec as Record<string, unknown>).paths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'API Gateway health check',
      responses: {
        200: {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  service: { type: 'string', example: 'api-gateway' },
                  timestamp: { type: 'string', format: 'date-time' },
                  uptime: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/users/auth/register': {
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
        409: { description: 'Email already exists' },
      },
    },
  },
  '/api/v1/users/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with email and password',
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
  '/api/v1/users/auth/refresh': {
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
        200: {
          description: 'Token refreshed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        401: { description: 'Invalid refresh token' },
      },
    },
  },
  '/api/v1/users/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Logged out successfully' },
      },
    },
  },
  '/api/v1/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update user profile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                fullName: { type: 'string' },
                phone: { type: 'string' },
                avatar: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Profile updated' },
        401: { description: 'Unauthorized' },
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Delete user account',
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: 'Account deleted' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/users/bus-templates': {
    get: {
      tags: ['Bus Templates'],
      summary: 'Get all active bus templates',
      responses: {
        200: {
          description: 'List of bus templates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/BusTemplate' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/users/bus-templates/{id}': {
    get: {
      tags: ['Bus Templates'],
      summary: 'Get bus template by ID with seats',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: {
          description: 'Bus template with seats',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BusTemplate' },
            },
          },
        },
        404: { description: 'Template not found' },
      },
    },
  },
  '/api/v1/routes': {
    get: {
      tags: ['Routes'],
      summary: 'Get all routes',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: 'List of routes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Route' },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Routes'],
      summary: 'Create a new route (Operator only)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fromCity', 'toCity', 'departureTime', 'arrivalTime', 'price'],
              properties: {
                fromCity: { type: 'string' },
                toCity: { type: 'string' },
                departureTime: { type: 'string', format: 'date-time' },
                arrivalTime: { type: 'string', format: 'date-time' },
                price: { type: 'number' },
                busTemplateId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Route created' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - Operator role required' },
      },
    },
  },
  '/api/v1/routes/{id}': {
    get: {
      tags: ['Routes'],
      summary: 'Get route by ID',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: {
          description: 'Route details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Route' },
            },
          },
        },
        404: { description: 'Route not found' },
      },
    },
    put: {
      tags: ['Routes'],
      summary: 'Update route (Operator only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: { description: 'Route updated' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Route not found' },
      },
    },
    delete: {
      tags: ['Routes'],
      summary: 'Delete route (Operator only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: { description: 'Route deleted' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
  },
  '/api/v1/routes/search/routes': {
    post: {
      tags: ['Search'],
      summary: 'Search routes by criteria',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SearchRequest' },
          },
        },
      },
      responses: {
        200: {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Route' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/routes/search/popular': {
    get: {
      tags: ['Search'],
      summary: 'Get popular routes',
      parameters: [
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        200: { description: 'Popular routes' },
      },
    },
  },
  '/api/v1/routes/search/suggestions': {
    get: {
      tags: ['Search'],
      summary: 'Get autocomplete suggestions',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Suggestions' },
      },
    },
  },
  '/api/v1/booking/seats/availability': {
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
  '/api/v1/booking/seats/check': {
    post: {
      tags: ['Seats'],
      summary: 'Check if specific seats are available',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['routeId', 'departureDate', 'seatNumbers'],
              properties: {
                routeId: { type: 'string', format: 'uuid' },
                departureDate: { type: 'string', format: 'date' },
                seatNumbers: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Seat check result' },
      },
    },
  },
  '/api/v1/booking/seats/hold': {
    post: {
      tags: ['Seats'],
      summary: 'Temporarily hold seats',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['routeId', 'departureDate', 'seatNumbers'],
              properties: {
                routeId: { type: 'string', format: 'uuid' },
                departureDate: { type: 'string', format: 'date' },
                seatNumbers: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Seats held' },
        401: { description: 'Unauthorized' },
        409: { description: 'Seats not available' },
      },
    },
  },
  '/api/v1/booking/bookings': {
    post: {
      tags: ['Bookings'],
      summary: 'Create a new booking',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBookingRequest' },
          },
        },
      },
      responses: {
        201: {
          description: 'Booking created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Booking' },
            },
          },
        },
        401: { description: 'Unauthorized' },
        409: { description: 'Seats not available' },
      },
    },
  },
  '/api/v1/booking/bookings/my': {
    get: {
      tags: ['Bookings'],
      summary: 'Get current user bookings',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'User bookings' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/booking/bookings/{id}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: { description: 'Booking details' },
        401: { description: 'Unauthorized' },
        404: { description: 'Booking not found' },
      },
    },
  },
  '/api/v1/booking/bookings/code/{code}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking by code',
      parameters: [
        {
          name: 'code',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          example: 'VXV123456',
        },
      ],
      responses: {
        200: { description: 'Booking details' },
        404: { description: 'Booking not found' },
      },
    },
  },
  '/api/v1/booking/bookings/{id}/cancel': {
    post: {
      tags: ['Bookings'],
      summary: 'Cancel a booking',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Booking cancelled' },
        401: { description: 'Unauthorized' },
        404: { description: 'Booking not found' },
        409: { description: 'Cannot cancel - booking already processed' },
      },
    },
  },
};
