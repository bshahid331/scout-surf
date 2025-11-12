// ═══════════════════════════════════════════════════════════════
// CORS Configuration and Middleware Utilities
// ═══════════════════════════════════════════════════════════════

import { Context, Next } from 'hono';

/**
 * CORS configuration options for different environments
 */
export interface CORSConfig {
  /** List of allowed origins for CORS */
  allowedOrigins: string[];
  /** HTTP methods to allow */
  allowedMethods: string[];
  /** Headers to allow in requests */
  allowedHeaders: string[];
  /** Headers to expose to the client */
  exposedHeaders: string[];
  /** Whether to allow credentials */
  allowCredentials: boolean;
  /** Max age for preflight cache */
  maxAge: number;
  /** Internal regex patterns for origin matching */
  _patterns?: RegExp[];
}

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: [], // Will be populated by environment
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Request-ID',
    'X-Wallet-Address',
    'x-api-key',
    'x-schedule-id',
    // x402 payment header (both cases)
    'x-payment',
    'X-Payment',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Remaining',
    // x402 response headers that clients need to read
    'x-payment',
    'X-Payment',
    'X-Payment-Required',
    'X-Payment-Network',
    'X-Payment-Asset',
    'X-Payment-Amount',
    'X-Payment-Address',
    'WWW-Authenticate',
  ],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Environment-specific CORS configurations
 */
export interface EnvironmentCORSConfig {
  /** Development environment domains */
  development: string[];
  /** Production environment domains */
  production: string[];
  /** Always allowed domains (localhost, etc.) */
  common: string[];
}

/**
 * Generate CORS configuration based on environment and custom domains
 */
export function generateCORSConfig(
  environment: 'development' | 'production',
  customDomains: string[] = [],
  overrides: Partial<CORSConfig> = {},
): CORSConfig {
  const commonOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://localhost:3000',
    'https://localhost:3001',
  ];

  const environmentOrigins =
    environment === 'production'
      ? [
          // Production domains (always allowed)
          'https://scout.surf',
        ]
      : [
          // Development patterns
          /^https?:\/\/.*\.poof\.new$/,
          /^https?:\/\/.*\.wish\.poof\.new$/,
        ];

  // Convert custom domains to full URLs
  const customOrigins = customDomains.flatMap((domain) => [
    `https://${domain}`,
    `http://${domain}`, // Allow HTTP for development
  ]);

  // Combine all origins
  const productionDomains = environment === 'production' ? environmentOrigins as string[] : [];
  const allOrigins = [...commonOrigins, ...customOrigins, ...productionDomains];

  // Add regex patterns for development
  const originPatterns = environment === 'development' ? environmentOrigins as RegExp[] : [];

  return {
    ...DEFAULT_CORS_CONFIG,
    allowedOrigins: allOrigins,
    ...overrides,
    // Store patterns separately for matching logic
    _patterns: originPatterns as any,
  };
}

/**
 * Check if an origin is allowed based on the CORS config
 */
export function isOriginAllowed(origin: string | null, config: CORSConfig): boolean {
  if (!origin) return false;

  // Check exact matches
  if (config.allowedOrigins.includes(origin)) {
    return true;
  }

  // Check regex patterns (stored in _patterns if available)
  const patterns = (config as any)._patterns as RegExp[] | undefined;
  if (patterns) {
    return patterns.some((pattern) => pattern.test(origin));
  }

  return false;
}

/**
 * CORS middleware for Hono
 */
export function corsMiddleware(config: CORSConfig = DEFAULT_CORS_CONFIG) {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    const requestMethod = c.req.header('Access-Control-Request-Method');

    // Handle preflight OPTIONS requests
    if (c.req.method === 'OPTIONS') {
      // Check if origin is allowed
      if (origin && isOriginAllowed(origin, config)) {
        c.res.headers.set('Access-Control-Allow-Origin', origin);

        if (config.allowCredentials) {
          c.res.headers.set('Access-Control-Allow-Credentials', 'true');
        }

        c.res.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
        c.res.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
        c.res.headers.set('Access-Control-Max-Age', config.maxAge.toString());

        return new Response('', { status: 204 });
      } else {
        return new Response('CORS preflight failed', { status: 403 });
      }
    }

    await next();

    // Set CORS headers for actual requests
    if (origin && isOriginAllowed(origin, config)) {
      c.res.headers.set('Access-Control-Allow-Origin', origin);

      if (config.allowCredentials) {
        c.res.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (config.exposedHeaders.length > 0) {
        c.res.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
      }
    }
  };
}

/**
 * Utility to get CORS domains from environment variables
 */
export function getCORSDomainsFromEnv(): {
  development: string[];
  production: string[];
  taskId?: string;
  appId?: string;
} {
  // These will be set during deployment by the build process
  const devDomains = process.env.CORS_DEV_DOMAINS?.split(',').filter(Boolean) || [];
  const prodDomains = process.env.CORS_PROD_DOMAINS?.split(',').filter(Boolean) || [];
  const taskId = process.env.CORS_TASK_ID;
  const appId = process.env.CORS_APP_ID;

  return {
    development: devDomains,
    production: prodDomains,
    taskId,
    appId,
  };
}

/**
 * Initialize CORS configuration based on environment
 */
export function initializeCORS(environment?: 'development' | 'production'): CORSConfig {
  const env = environment || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  const corsInfo = getCORSDomainsFromEnv();

  // For development, include task and app specific domains
  const developmentDomains = [
    ...corsInfo.development,
    ...(corsInfo.taskId ? [`${corsInfo.taskId}.poof.new`] : []),
    ...(corsInfo.appId ? [`${corsInfo.appId}.poof.new`] : []),
  ];

  const domains = env === 'production' ? corsInfo.production : developmentDomains;

  console.log(`🌐 CORS initialized for ${env} with domains:`, domains);

  return generateCORSConfig(env, domains);
}

/**
 * Route-specific CORS configuration override
 * Use this to customize CORS for specific routes
 */
export function routeCORS(routeOverrides: Partial<CORSConfig>, baseConfig?: CORSConfig) {
  const base = baseConfig || initializeCORS();
  return corsMiddleware({
    ...base,
    ...routeOverrides,
  });
}
