export const paymentPaths = {
  '/api/v1/payments': {
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
                bookingId: { type: 'string', format: 'uuid' },
                amount: { type: 'number', minimum: 10000 },
                method: { type: 'string', enum: ['VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH'] },
                locale: { type: 'string', enum: ['vn', 'en'], default: 'vn' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Payment created' },
      },
    },
  },
  '/api/v1/payments/{paymentId}': {
    get: {
      tags: ['Payments'],
      summary: 'Get payment status by ID',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'paymentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Payment status' },
      },
    },
  },
  '/api/v1/payments/admin/all': {
    get: {
      tags: ['Admin', 'Payments'],
      summary: 'List all payments (admin/operator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'method', in: 'query', schema: { type: 'string' } },
        { name: 'provider', in: 'query', schema: { type: 'string' } },
        { name: 'bookingCode', in: 'query', schema: { type: 'string' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Paginated admin payments' },
      },
    },
  },
  '/api/v1/payments/admin/summary': {
    get: {
      tags: ['Admin', 'Payments'],
      summary: 'Payment summary aggregates (admin/operator)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'days', in: 'query', schema: { type: 'integer', default: 7, minimum: 1, maximum: 90 } },
      ],
      responses: {
        200: { description: 'Payment summary' },
      },
    },
  },
  '/api/v1/webhooks/vnpay/return': {
    get: {
      tags: ['Webhooks'],
      summary: 'VNPay return URL (client redirect)',
      responses: { 200: { description: 'Redirect processing' } },
    },
  },
  '/api/v1/webhooks/vnpay/ipn': {
    get: {
      tags: ['Webhooks'],
      summary: 'VNPay IPN URL (server-to-server notification)',
      responses: { 200: { description: 'IPN acknowledgment' } },
    },
  },
};
