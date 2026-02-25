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
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Webhooks', description: 'External webhooks (VNPay, Momo, etc.)' },
    ],
  },
  apis: [], // We'll define paths inline
};

export const swaggerSpec = swaggerJsdoc(options) as Record<string, unknown>;

const paths = (swaggerSpec as Record<string, unknown>).paths as Record<string, unknown>;

paths['/health'] = {
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
};

// Payment Service Paths
paths['/api/v1/payments'] = {
  post: {
    tags: ['Payments'],
    summary: 'Create a new payment',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['bookingId', 'amount', 'bankCode'],
            properties: {
              bookingId: { type: 'string', format: 'uuid' },
              amount: { type: 'number', minimum: 10000 },
              bankCode: { type: 'string', example: 'VNBANK' },
              language: { type: 'string', example: 'vn' },
            },
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Payment created',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    paymentId: { type: 'string' },
                    paymentUrl: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

paths['/api/v1/payments/{paymentId}'] = {
  get: {
    tags: ['Payments'],
    summary: 'Get payment status by ID',
    parameters: [
      { name: 'paymentId', in: 'path', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: { description: 'Payment status' },
    },
  },
};

paths['/api/v1/webhooks/vnpay/return'] = {
  get: {
    tags: ['Webhooks'],
    summary: 'VNPay return URL (client redirect)',
    responses: {
      200: { description: 'Redirect processing' },
    },
  },
};

paths['/api/v1/webhooks/vnpay/ipn'] = {
  get: {
    tags: ['Webhooks'],
    summary: 'VNPay IPN URL (server-to-server notification)',
    responses: {
      200: { description: 'IPN acknowledgment' },
    },
  },
};

// Merged other service paths
Object.assign(paths, {
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
        400: { description: 'Bad request' },
      },
    },
  },
  '/api/v1/users/auth/login': {
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
        401: { description: 'Unauthorized' },
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
});
