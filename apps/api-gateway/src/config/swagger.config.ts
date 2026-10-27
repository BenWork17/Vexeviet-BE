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
        RouteSnapshot: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Hồ Chí Minh - Đà Lạt' },
            origin: { type: 'string', example: 'Hồ Chí Minh' },
            destination: { type: 'string', example: 'Đà Lạt' },
            departureLocation: { type: 'string', nullable: true },
            arrivalLocation: { type: 'string', nullable: true },
            departureTime: { type: 'string', format: 'date-time' },
            arrivalTime: { type: 'string', format: 'date-time' },
            duration: { type: 'number', description: 'Thời gian di chuyển (phút)' },
            busType: { type: 'string', enum: ['STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER'] },
            operatorName: { type: 'string', example: 'Phương Trang' },
          },
        },
        BookingDetail: {
          type: 'object',
          properties: {
            bookingId: { type: 'string', format: 'uuid' },
            bookingCode: { type: 'string', example: 'VXV1A2B3C4' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
            route: { $ref: '#/components/schemas/RouteSnapshot' },
            passengers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  seatNumber: { type: 'string' },
                  idNumber: { type: 'string' },
                  dateOfBirth: { type: 'string', format: 'date' },
                },
              },
            },
            seats: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2'] },
            totalPrice: {
              type: 'object',
              properties: {
                amount: { type: 'number', example: 360000 },
                currency: { type: 'string', example: 'VND' },
                breakdown: {
                  type: 'object',
                  properties: {
                    tickets: { type: 'number' },
                    insurance: { type: 'number' },
                    meal: { type: 'number' },
                    extraLuggage: { type: 'number' },
                    serviceFee: { type: 'number' },
                    discount: { type: 'number' },
                    total: { type: 'number' },
                  },
                },
              },
            },
            paymentDeadline: { type: 'string', format: 'date-time' },
            pickupPointId: { type: 'string' },
            dropoffPointId: { type: 'string' },
            contactInfo: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
              },
            },
            promoCode: { type: 'string', nullable: true },
            confirmedAt: { type: 'string', format: 'date-time', nullable: true },
            cancelledAt: { type: 'string', format: 'date-time', nullable: true },
            cancellationReason: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AdminBooking: {
          type: 'object',
          description:
            'Admin/operator row for the bookings management table (see be-CONTRACT-admin-api.md Shape 1)',
          properties: {
            id: { type: 'string', format: 'uuid' },
            bookingCode: { type: 'string', example: 'VXV7A8B9' },
            customerName: { type: 'string', example: 'Nguyễn Minh Anh' },
            customerEmail: { type: 'string', format: 'email', example: 'a@b.c' },
            customerPhone: { type: 'string', example: '0901234567' },
            operatorId: { type: 'string', format: 'uuid' },
            operatorName: { type: 'string', example: 'Phương Trang' },
            routeId: { type: 'string', format: 'uuid' },
            routeName: {
              type: 'string',
              example: 'TP.HCM → Đà Lạt',
              description: 'route.origin + literal " → " + route.destination',
            },
            departureDate: { type: 'string', format: 'date' },
            seats: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2'] },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'],
            },
            paymentStatus: {
              type: 'string',
              nullable: true,
              description:
                'Status of the most recent Payment for this booking; null when none exists.',
              enum: [
                'PENDING',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'CANCELLED',
                'EXPIRED',
                'REFUNDED',
                'PARTIALLY_REFUNDED',
              ],
            },
            totalAmount: {
              type: 'number',
              example: 700000,
              description: 'totalPrice + serviceFee - discount',
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AdminPayment: {
          type: 'object',
          description:
            'Admin/operator row for the payments management table (see be-CONTRACT-admin-api.md Shape 2)',
          properties: {
            id: { type: 'string', format: 'uuid' },
            bookingCode: { type: 'string', example: 'VXV7A8B9' },
            provider: {
              type: 'string',
              enum: ['VNPay', 'Momo', 'ZaloPay', 'BankTransfer', 'Cash'],
              example: 'VNPay',
              description: 'Display mapping of PaymentMethod; extra labels avoid data loss.',
            },
            method: {
              type: 'string',
              enum: ['VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH'],
            },
            status: {
              type: 'string',
              enum: [
                'PENDING',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'CANCELLED',
                'EXPIRED',
                'REFUNDED',
                'PARTIALLY_REFUNDED',
              ],
            },
            amount: { type: 'number', example: 700000 },
            risk: {
              type: 'string',
              enum: ['urgent', 'watch', 'normal'],
              example: 'normal',
              description:
                'Derived, never stored: FAILED/REFUNDED → urgent; PENDING >15min or PROCESSING >30min → watch; else normal.',
            },
            transactionRef: { type: 'string', example: 'VXV...' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AdminRoute: {
          type: 'object',
          description:
            'Admin row for the routes management table (see be-CONTRACT-admin-api.md Shape 3)',
          properties: {
            id: { type: 'string', format: 'uuid' },
            operatorId: { type: 'string', format: 'uuid' },
            operatorName: { type: 'string', example: 'Phương Trang' },
            name: { type: 'string' },
            origin: { type: 'string', example: 'TP.HCM' },
            destination: { type: 'string', example: 'Đà Lạt' },
            departureTime: { type: 'string', format: 'date-time' },
            busType: {
              type: 'string',
              enum: ['STANDARD', 'VIP', 'LIMOUSINE', 'SLEEPER'],
            },
            totalSeats: {
              type: 'integer',
              nullable: true,
              description: 'BusTemplate.totalSeats; null when seat data is unavailable.',
            },
            availableSeats: {
              type: 'integer',
              nullable: true,
              description: 'null when seat data is unavailable.',
            },
            price: { type: 'number', example: 350000 },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] },
            seatDataAvailable: {
              type: 'boolean',
              description:
                'false when busTemplateId is null and no seats exist (totalSeats/availableSeats are then null).',
            },
          },
        },
        AdminUser: {
          type: 'object',
          description:
            'Admin row for the users management table (see be-CONTRACT-admin-api.md Shape 4)',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Nguyễn Minh Anh', description: 'firstName + lastName' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['ADMIN', 'OPERATOR', 'CUSTOMER'] },
            status: {
              type: 'string',
              enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'],
            },
            verified: {
              type: 'boolean',
              description: 'isEmailVerified && isPhoneVerified',
            },
            isEmailVerified: { type: 'boolean' },
            isPhoneVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          description:
            'Response shape for GET /api/v1/audit-logs (see be-CONTRACT-admin-api.md Shape 5)',
          properties: {
            id: { type: 'string', format: 'uuid' },
            actor: {
              type: 'string',
              example: 'VeXeViet Admin',
              description: 'Stored AuditLog.actorName (renamed in the response).',
            },
            actorId: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: ['ADMIN', 'OPERATOR', 'CUSTOMER', 'SYSTEM'],
              description: 'Stored AuditLog.actorRole (renamed in the response).',
            },
            action: { type: 'string', example: 'USER_ROLE_UPDATED' },
            target: { type: 'string', example: 'user:9f0c' },
            targetId: { type: 'string', nullable: true },
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'danger'],
              description:
                'Lowercase in the response; the DB enum stays uppercase and is converted in the mapper.',
            },
            metadata: {
              type: 'object',
              nullable: true,
              example: { from: 'CUSTOMER', to: 'OPERATOR' },
            },
            createdAt: { type: 'string', format: 'date-time' },
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
      { name: 'Admin', description: 'Admin & operator management endpoints (role ADMIN unless noted)' },
      { name: 'Audit Logs', description: 'Shared admin audit trail (role ADMIN)' },
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
            required: ['bookingId', 'amount', 'method'],
            properties: {
              bookingId: { type: 'string', format: 'uuid', example: '463f7eb0-33b3-41b0-9ce5-b166fd99c280' },
              amount: { type: 'number', minimum: 10000, example: 600000 },
              method: { type: 'string', enum: ['VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH'], example: 'VNPAY' },
              language: { type: 'string', enum: ['vn', 'en'], default: 'vn', example: 'vn' },
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
              required: ['routeId', 'departureDate', 'seats', 'passengers', 'pickupPointId', 'dropoffPointId', 'contactInfo', 'idempotencyKey'],
              properties: {
                routeId: { type: 'string', format: 'uuid', description: 'ID tuyến xe', example: '0010129d-59bc-4341-9554-00bb5a87be59' },
                departureDate: { type: 'string', format: 'date', example: '2026-03-01', description: 'Ngày khởi hành (YYYY-MM-DD)' },
                seats: { type: 'array', items: { type: 'string' }, example: ['1A', '2A'], description: 'Danh sách số ghế' },
                passengers: {
                  type: 'array',
                  description: 'Thông tin hành khách (số lượng phải bằng số ghế)',
                  example: [
                    { firstName: 'Van A', lastName: 'Nguyen', seatNumber: '1A', idNumber: '079123456789', dateOfBirth: '1990-01-15' },
                    { firstName: 'Thi B', lastName: 'Tran', seatNumber: '2A', idNumber: '079987654321', dateOfBirth: '1992-05-20' },
                  ],
                  items: {
                    type: 'object',
                    required: ['firstName', 'lastName', 'seatNumber'],
                    properties: {
                      firstName: { type: 'string', example: 'Van A' },
                      lastName: { type: 'string', example: 'Nguyen' },
                      seatNumber: { type: 'string', example: 'A1' },
                      idNumber: { type: 'string', example: '079123456789' },
                      dateOfBirth: { type: 'string', format: 'date', example: '1990-01-15' },
                    },
                  },
                },
                pickupPointId: { type: 'string', example: 'pickup-1', description: 'Điểm đón' },
                dropoffPointId: { type: 'string', example: 'dropoff-1', description: 'Điểm trả' },
                contactInfo: {
                  type: 'object',
                  required: ['email', 'phone'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    phone: { type: 'string', example: '0901234567' },
                  },
                },
                addons: {
                  type: 'object',
                  properties: {
                    insurance: { type: 'boolean', description: 'Bảo hiểm (+50,000 VND/người)' },
                    meal: { type: 'boolean', description: 'Suất ăn (+30,000 VND/người)' },
                    extraLuggage: { type: 'boolean', description: 'Hành lý thêm (+100,000 VND)' },
                  },
                },
                promoCode: { type: 'string', description: 'Mã khuyến mãi' },
                idempotencyKey: { type: 'string', format: 'uuid', description: 'UUID chống tạo trùng booking' },
                notes: { type: 'string', description: 'Ghi chú' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Booking created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      bookingId: { type: 'string', format: 'uuid' },
                      bookingCode: { type: 'string', example: 'VXV1A2B3C4' },
                      status: { type: 'string', example: 'PENDING' },
                      route: { $ref: '#/components/schemas/RouteSnapshot' },
                      passengers: { type: 'array', items: { type: 'object' } },
                      seats: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2'] },
                      totalPrice: {
                        type: 'object',
                        properties: {
                          amount: { type: 'number', example: 360000 },
                          currency: { type: 'string', example: 'VND' },
                          breakdown: {
                            type: 'object',
                            properties: {
                              tickets: { type: 'number' },
                              serviceFee: { type: 'number' },
                              discount: { type: 'number' },
                              total: { type: 'number' },
                            },
                          },
                        },
                      },
                      paymentDeadline: { type: 'string', format: 'date-time', description: '15 phút từ lúc tạo' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized - Thiếu hoặc sai JWT token' },
        404: { description: 'Route not found' },
        409: { description: 'Seats not available / Conflict' },
      },
    },
  },
  '/api/v1/bookings/my': {
    get: {
      tags: ['Bookings'],
      summary: 'Get current user\'s bookings',
      description: 'Lấy danh sách booking của user đang đăng nhập, có phân trang và filter',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] }, description: 'Filter theo trạng thái' },
        { name: 'fromDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Từ ngày khởi hành' },
        { name: 'toDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Đến ngày khởi hành' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'departureDate', 'totalPrice'], default: 'createdAt' } },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
      ],
      responses: {
        200: {
          description: 'Paginated list of bookings',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/bookings/code/{code}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking by booking code',
      description: 'Tra cứu booking bằng mã đặt vé (VD: VXV1A2B3C4). Nếu có JWT sẽ trả đầy đủ thông tin, không có JWT trả thông tin giới hạn.',
      parameters: [
        { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'VXV1A2B3C4', description: 'Mã booking' },
      ],
      responses: {
        200: {
          description: 'Booking detail',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/BookingDetail' },
                },
              },
            },
          },
        },
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
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Booking ID' },
      ],
      responses: {
        200: {
          description: 'Booking detail',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/BookingDetail' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Booking not found' },
      },
    },
  },
  '/api/v1/bookings/{id}/cancel': {
    post: {
      tags: ['Bookings'],
      summary: 'Cancel a booking',
      description: 'Hủy booking (chỉ hủy được khi status = PENDING hoặc CONFIRMED)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: { type: 'string', example: 'Thay đổi lịch trình', description: 'Lý do hủy (không bắt buộc)' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Booking cancelled successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/BookingDetail' },
                  message: { type: 'string', example: 'Booking cancelled successfully' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        404: { description: 'Booking not found' },
        409: { description: 'Cannot cancel (already cancelled/completed)' },
      },
    },
  },
  '/api/v1/bookings/{id}/confirm': {
    post: {
      tags: ['Bookings'],
      summary: 'Confirm a booking (after payment)',
      description: 'API nội bộ - xác nhận booking sau khi thanh toán thành công. Sẽ chuyển status từ PENDING → CONFIRMED và lock ghế.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: {
          description: 'Booking confirmed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { $ref: '#/components/schemas/BookingDetail' },
                  message: { type: 'string', example: 'Booking confirmed successfully' },
                },
              },
            },
          },
        },
        404: { description: 'Booking not found' },
        409: { description: 'Cannot confirm (not PENDING or expired)' },
      },
    },
  },
  '/api/v1/seats/check': {
    post: {
      tags: ['Seats'],
      summary: 'Check if specific seats are available',
      description: 'Kiểm tra danh sách ghế có còn trống không trước khi hold/booking',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['routeId', 'departureDate', 'seats'],
              properties: {
                routeId: { type: 'string', format: 'uuid' },
                departureDate: { type: 'string', format: 'date', example: '2026-02-15' },
                seats: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2'] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Seat check result',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      available: { type: 'boolean' },
                      unavailableSeats: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/v1/seats/hold': {
    post: {
      tags: ['Seats'],
      summary: 'Temporarily hold seats',
      description: 'Giữ ghế tạm thời trước khi tạo booking. Mặc định 15 phút, có thể tùy chỉnh bằng ttlSeconds.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['routeId', 'departureDate', 'seats'],
              properties: {
                routeId: { type: 'string', format: 'uuid' },
                departureDate: { type: 'string', format: 'date', example: '2026-02-15' },
                seats: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2'] },
                ttlSeconds: { type: 'integer', default: 900, description: 'Thời gian giữ ghế (giây), mặc định 900 (15 phút)' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Seats held successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      holdId: { type: 'string', format: 'uuid', description: 'ID để release ghế' },
                      seats: { type: 'array', items: { type: 'string' } },
                      expiresAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        409: { description: 'Seats not available' },
      },
    },
  },
  '/api/v1/seats/release': {
    post: {
      tags: ['Seats'],
      summary: 'Release held seats',
      description: 'Giải phóng ghế đã giữ (khi user không muốn đặt nữa)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['holdId'],
              properties: {
                holdId: { type: 'string', format: 'uuid', description: 'Hold ID nhận từ API hold seats' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Seats released',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string', example: 'Seats released successfully' },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/api/v1/seats/validate': {
    post: {
      tags: ['Seats'],
      summary: 'Validate seat numbers for a route',
      description: 'Kiểm tra số ghế có hợp lệ cho tuyến xe hay không (dựa trên BusTemplate)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['routeId', 'seats'],
              properties: {
                routeId: { type: 'string', format: 'uuid' },
                seats: { type: 'array', items: { type: 'string' }, example: ['A1', 'A2', 'X99'] },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Validation result',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      valid: { type: 'boolean' },
                      invalidSeats: { type: 'array', items: { type: 'string' }, example: ['X99'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  // ---------------------------------------------------
  // Admin & operator management (admin UI contract)
  // ---------------------------------------------------
  '/api/v1/bookings/admin/all': {
    get: {
      tags: ['Admin', 'Bookings'],
      summary: 'List all bookings (admin)',
      description:
        'Danh sách booking toàn hệ thống cho trang quản trị. Yêu cầu Bearer JWT với role ADMIN, hoặc role OPERATOR (chỉ trả booking thuộc tuyến/chuyến của nhà xe mình).',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED'] }, description: 'Filter theo trạng thái booking' },
        { name: 'paymentStatus', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED'] }, description: 'Filter theo trạng thái thanh toán' },
        { name: 'operatorId', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter theo nhà xe (ADMIN only)' },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Tìm theo mã booking / email hoặc tên khách (không phân biệt hoa thường)' },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Từ ngày khởi hành' },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Đến ngày khởi hành' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['createdAt', '-createdAt', 'departureDate', '-departureDate'], default: '-createdAt' }, description: 'Sắp xếp (mặc định -createdAt)' },
      ],
      responses: {
        200: {
          description: 'Paginated bookings',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/AdminBooking' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN or OPERATOR' },
      },
    },
  },
  '/api/v1/bookings/admin/dashboard': {
    get: {
      tags: ['Admin', 'Bookings'],
      summary: 'Booking dashboard aggregates (admin)',
      description:
        'Số liệu tổng hợp cho dashboard admin (contract Shape 1): booking hôm nay, doanh thu đã hoàn tất, thanh toán cần xử lý, tuyến đang hoạt động, số nhà xe, xu hướng doanh thu và phân bố booking theo trạng thái trong cửa sổ N ngày. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'days',
          in: 'query',
          schema: { type: 'integer', default: 7, minimum: 1, maximum: 90 },
          description: 'Cửa sổ số ngày (1..90, mặc định 7)',
        },
      ],
      responses: {
        200: {
          description: 'Dashboard aggregates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      todayBookings: { type: 'integer', example: 12 },
                      revenueCompleted: { type: 'number', example: 8450000 },
                      paymentsNeedingAction: { type: 'integer', example: 3 },
                      activeRoutes: { type: 'integer', example: 41 },
                      operatorCount: { type: 'integer', example: 9 },
                      revenueTrend: {
                        type: 'array',
                        description: 'One zero-filled point per day across the window',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string', example: '2026-10-21' },
                            value: { type: 'number', example: 4200000 },
                          },
                        },
                      },
                      bookingStatusSummary: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string', example: 'CONFIRMED' },
                            value: { type: 'integer', example: 38 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/payments/admin/all': {
    get: {
      tags: ['Admin', 'Payments'],
      summary: 'List all payments (admin)',
      description:
        'Danh sách giao dịch thanh toán toàn hệ thống. Yêu cầu Bearer JWT với role ADMIN, hoặc role OPERATOR (chỉ trả giao dịch thuộc dữ liệu của nhà xe mình).',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
        { name: 'method', in: 'query', schema: { type: 'string', enum: ['VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH'] } },
        { name: 'provider', in: 'query', schema: { type: 'string', enum: ['VNPay', 'Momo', 'ZaloPay', 'BankTransfer', 'Cash'] }, description: 'Filter theo nhà cung cấp (nhãn hiển thị)' },
        { name: 'bookingCode', in: 'query', schema: { type: 'string' }, description: 'Tìm theo mã booking' },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Từ ngày tạo' },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Đến ngày tạo' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: {
          description: 'Paginated payments',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/AdminPayment' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN or OPERATOR' },
      },
    },
  },
  '/api/v1/payments/admin/summary': {
    get: {
      tags: ['Admin', 'Payments'],
      summary: 'Payment summary aggregates (admin)',
      description:
        'Tổng hợp thanh toán (contract Shape 2): tổng tiền đã hoàn tất, số lượng theo từng trạng thái, xu hướng theo ngày và số giao dịch hết hạn trong N ngày gần nhất. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 7, minimum: 1, maximum: 90 }, description: 'Số ngày gần nhất (1..90, mặc định 7)' },
      ],
      responses: {
        200: {
          description: 'Payment summary',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      totalCompleted: { type: 'number', example: 1234.5 },
                      countByStatus: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string', example: 'COMPLETED' },
                            value: { type: 'integer', example: 88 },
                          },
                        },
                      },
                      providerTrend: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string', example: '2026-10-21' },
                            value: { type: 'number', example: 4200000 },
                          },
                        },
                      },
                      expiredCount: { type: 'integer', example: 4 },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/routes/admin/all': {
    get: {
      tags: ['Admin', 'Routes'],
      summary: 'List all routes (admin)',
      description:
        'Danh sách tuyến xe cho trang quản trị. Mặc định loại trừ tuyến đã xóa mềm; chỉ trả các tuyến status=DELETED khi includeDeleted=true. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DELETED'] }, description: 'Filter theo trạng thái' },
        { name: 'operatorId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Tìm theo tên tuyến / điểm đi / điểm đến' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
        { name: 'includeDeleted', in: 'query', schema: { type: 'boolean', default: false }, description: 'true → cũng trả các tuyến status=DELETED (mặc định false)' },
      ],
      responses: {
        200: {
          description: 'Paginated routes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/AdminRoute' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/routes/admin/operators': {
    get: {
      tags: ['Admin', 'Routes'],
      summary: 'List operator aggregates (admin)',
      description:
        'Danh sách nhà xe suy ra từ User role=OPERATOR (không có bảng operator riêng), kèm số tuyến đang hoạt động và số booking 30 ngày gần nhất. rating luôn là null vì schema chưa có dữ liệu đánh giá. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: {
          description: 'Paginated operator aggregates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Phương Trang' },
                        contactEmail: { type: 'string', format: 'email', example: 'ops@phuongtrang.vn' },
                        activeRoutes: { type: 'integer', example: 12 },
                        monthlyBookings: { type: 'integer', example: 340 },
                        rating: {
                          type: 'number',
                          nullable: true,
                          description: 'Always null — no rating data exists in the schema.',
                        },
                        status: {
                          type: 'string',
                          enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'],
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/users/admin/all': {
    get: {
      tags: ['Admin', 'Users'],
      summary: 'List all users (admin)',
      description:
        'Danh sách người dùng cho trang quản trị. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['ADMIN', 'OPERATOR', 'CUSTOMER'] } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'] } },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Tìm theo email / tên / SĐT' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: {
          description: 'Paginated users',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/AdminUser' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
  '/api/v1/users/admin/{id}': {
    patch: {
      tags: ['Admin', 'Users'],
      summary: 'Update a user role or status (admin)',
      description:
        'Cập nhật role và/hoặc status của một người dùng. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID' },
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
        200: {
          description: 'User updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/AdminUser' },
                },
              },
            },
          },
        },
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
      description:
        'Nhật ký thao tác quản trị dùng chung, mới nhất trước. Yêu cầu Bearer JWT với role ADMIN.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'actor', in: 'query', schema: { type: 'string' }, description: 'Filter theo actorId hoặc tên actor' },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['INFO', 'WARNING', 'DANGER'] } },
        { name: 'action', in: 'query', schema: { type: 'string' }, description: 'Filter theo action, ví dụ USER_ROLE_UPDATED' },
        { name: 'target', in: 'query', schema: { type: 'string' }, description: 'Filter theo target, ví dụ user:9f0c' },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Từ ngày tạo' },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Đến ngày tạo' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: {
          description: 'Paginated audit logs (newest first)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
                  pagination: {
                    type: 'object',
                    properties: {
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      total: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden - requires role ADMIN' },
      },
    },
  },
});
