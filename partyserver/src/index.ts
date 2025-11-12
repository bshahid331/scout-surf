// ═══════════════════════════════════════════════════════════════
// Hono-Party PartyServer Template
// ═══════════════════════════════════════════════════════════════
import { init } from '@pooflabs/server';
import { Hono } from 'hono';
import { partyserverMiddleware } from 'hono-party';
import { requestIdMiddleware } from './lib/api-response.js';
import { corsMiddleware, initializeCORS } from './lib/cors-helpers.js';
import { createRequestLogger, globalErrorHandler } from './lib/request-logger.js';
import { x402Middleware } from './lib/x402-middleware.js';
import { getRoutesSummary, registerRoutes } from './routes/index.js';

// ═══════════════════════════════════════════════════════════════
// HONO APP SETUP
// ═══════════════════════════════════════════════════════════════

const app = new Hono();

// ═══════════════════════════════════════════════════════════════
// TAROBASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════
app.use('*', async (c, next) => {
  if (!process.env.TAROBASE_SOLANA_KEYPAIR && process.env.ADMIN_SOLANA_PRIVATE_KEY) {
    process.env.TAROBASE_SOLANA_KEYPAIR = process.env.ADMIN_SOLANA_PRIVATE_KEY;
  }
  if (process.env.PROJECT_VAULT_PRIVATE_KEY) {
    process.env.TAROBASE_SOLANA_KEYPAIR = process.env.PROJECT_VAULT_PRIVATE_KEY;
  }
  await init({
    appId: process.env.TAROBASE_APP_ID,
    rpcUrl: process.env.SOLANA_RPC_URL,
    apiUrl: 'https://api-staging.tarobase.com',
    authApiUrl: 'https://auth-staging.tarobase.com'
  });
  await next();
});

// ═══════════════════════════════════════════════════════════════
// CORS CONFIGURATION - Applied globally
// ═══════════════════════════════════════════════════════════════

// Initialize CORS based on environment and configured domains
const corsConfig = initializeCORS();
app.use('*', corsMiddleware(corsConfig));

// Basic setup without authentication (default)
app.use('*', partyserverMiddleware());

// ═══════════════════════════════════════════════════════════════
// API ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════

// Add request ID middleware for better tracing (must be before access logger)
app.use('*', requestIdMiddleware());

// Add logging for all HTTP requests (logs method, URL, user, status, timing)
app.use('*', createRequestLogger());

// Add x402 payment middleware (applies to specific routes only)
app.use('*', x402Middleware);

// Add global error handler to catch ANY unhandled errors
app.onError(globalErrorHandler());

// Register all API routes from the routes registry
registerRoutes(app);

// ═══════════════════════════════════════════════════════════════
// ROOT ENDPOINT - API Information
// ═══════════════════════════════════════════════════════════════

app.get('/', (c) => {
  return c.json({
    name: 'PartyServer Template with Hono-Party',
    version: '1.0.0',
    description: 'Real-time WebSocket server with typed API endpoints',

    // Server features
    features: [
      'RESTful API endpoints',
      'Pluggable authentication',
      'CORS configuration',
      'Request logging',
    ],

    // API information
    api: {
      baseUrl: c.req.url.replace(c.req.path, ''),
      documentation: '/docs', // Future: API docs endpoint
      sdk: {
        typescript: 'Generated TypeScript SDK available',
        generation: 'Use route registry for type-safe SDK generation',
      },
    },

    // Available endpoints summary
    endpoints: {
      health: 'GET /health - System health check',
      root: 'GET / - API information',
    },

    timestamp: Date.now(),
  });
});

// ═══════════════════════════════════════════════════════════════
// STARTUP LOGGING
// ═══════════════════════════════════════════════════════════════

// Log routes summary on startup (helpful for debugging)
console.log(getRoutesSummary());

export default app;
