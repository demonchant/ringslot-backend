/**
 * OpenAPI 3.1 specification for the RingSlot API.
 */

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'RingSlot API',
    version: '1.0.0',
    description: 'RingSlot SMS verification platform API. Provides virtual phone number rental, OTP reception, wallet management, and developer webhook integrations.',
    contact: {
      name: 'RingSlot Developer Support',
      email: 'dev@ringslot.com',
      url: 'https://ringslot.com/docs',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current production API',
    },
  ],
  security: [
    { ApiKeyAuth: [] },
    { BearerAuth: [] },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key obtained from the developer dashboard. Format: rs_live_<id>',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
        },
        required: ['error'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'admin'] },
        },
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          country: { type: 'string' },
          price: { type: 'number' },
          available: { type: 'integer' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          service: { type: 'string' },
          number: { type: 'string' },
          status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
          sms: { type: 'array', items: { type: 'object', properties: { code: { type: 'string' }, text: { type: 'string' }, received_at: { type: 'string', format: 'date-time' } } } },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      WalletBalance: {
        type: 'object',
        properties: {
          balance: { type: 'number', description: 'Current balance in USD' },
          currency: { type: 'string', default: 'USD' },
        },
      },
      Deposit: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
          payment_url: { type: 'string', format: 'uri' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      AcceptVersion: {
        name: 'Accept-Version',
        in: 'header',
        required: false,
        schema: { type: 'string', default: '1.0.0' },
        description: 'API version to use',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new account',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in and obtain JWT token',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', description: 'JWT bearer token' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/services': {
      get: {
        summary: 'List available SMS services',
        tags: ['Services'],
        security: [],
        parameters: [
          { name: 'country', in: 'query', schema: { type: 'string' }, description: 'Filter by country code' },
          { name: 'service', in: 'query', schema: { type: 'string' }, description: 'Filter by service name' },
        ],
        responses: {
          200: {
            description: 'List of available services',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    services: { type: 'array', items: { $ref: '#/components/schemas/Service' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/orders/buy': {
      post: {
        summary: 'Purchase a virtual number for SMS verification',
        tags: ['Orders'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  service: { type: 'string', description: 'Service slug (e.g., "telegram")' },
                  country: { type: 'string', description: 'Country code (e.g., "us")' },
                },
                required: ['service', 'country'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Number purchased',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
              },
            },
          },
          400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          402: { description: 'Insufficient balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/orders/sms': {
      get: {
        summary: 'Check for received SMS on active orders',
        tags: ['Orders'],
        parameters: [
          { name: 'order_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order ID to check' },
        ],
        responses: {
          200: {
            description: 'SMS status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    order_id: { type: 'string' },
                    sms: { type: 'array', items: { type: 'object', properties: { code: { type: 'string' }, text: { type: 'string' }, received_at: { type: 'string', format: 'date-time' } } } },
                  },
                },
              },
            },
          },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/orders/cancel': {
      post: {
        summary: 'Cancel an active order and refund balance',
        tags: ['Orders'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  order_id: { type: 'string', format: 'uuid' },
                },
                required: ['order_id'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Order cancelled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    refund_amount: { type: 'number' },
                  },
                },
              },
            },
          },
          400: { description: 'Cannot cancel order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/orders/rent': {
      post: {
        summary: 'Rent a number for extended SMS reception',
        tags: ['Orders'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  service: { type: 'string' },
                  country: { type: 'string' },
                  duration: { type: 'integer', description: 'Rental duration in hours', minimum: 1 },
                },
                required: ['service', 'country', 'duration'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Number rented',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
              },
            },
          },
          400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          402: { description: 'Insufficient balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/wallet/balance': {
      get: {
        summary: 'Get current wallet balance',
        tags: ['Wallet'],
        responses: {
          200: {
            description: 'Current balance',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WalletBalance' },
              },
            },
          },
        },
      },
    },
    '/wallet/deposit': {
      post: {
        summary: 'Create a deposit to add funds',
        tags: ['Wallet'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', minimum: 1, description: 'Amount in USD' },
                  currency: { type: 'string', description: 'Cryptocurrency to pay with (e.g., "btc", "ltc", "trx")' },
                },
                required: ['amount', 'currency'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Deposit created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Deposit' },
              },
            },
          },
          400: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  tags: [
    { name: 'Authentication', description: 'Account registration and login' },
    { name: 'Services', description: 'Browse available SMS verification services' },
    { name: 'Orders', description: 'Purchase numbers and receive SMS codes' },
    { name: 'Wallet', description: 'Balance management and deposits' },
  ],
};

export default openApiSpec;

/**
 * Express route handler that serves the OpenAPI spec as JSON.
 * Mount at GET /api/v1/openapi.json
 */
export function openApiHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(openApiSpec);
}
