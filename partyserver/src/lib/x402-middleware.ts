/**
 * x402 Payment Middleware
 *
 * Global Hono middleware that enforces payment on specific routes using faremeter.
 * Applied globally in index.ts but only activates for configured paid routes.
 */

import type { Context, Next } from 'hono';
import { hono as middleware } from '@faremeter/middleware';
import { solana } from '@faremeter/info';
import { PROJECT_VAULT_ADDRESS } from '../constants.js';

/**
 * Global x402 middleware that enforces payment on POST /api/scouts/create
 *
 * Usage in index.ts:
 * ```typescript
 * import { x402Middleware } from './lib/x402-middleware.js';
 * app.use('*', x402Middleware);
 * ```
 */
export async function x402Middleware(c: Context, next: Next) {
  const path = c.req.path;
  const method = c.req.method;

  // Only apply to POST /api/scouts/create
  if (path !== '/api/scouts/create' || method !== 'POST') {
    return await next();
  }

  console.log('[x402] Payment-protected route accessed: POST /api/scouts/create');

  // Detect environment (devnet for preview, mainnet-beta for production)
  const env = process.env.ENV || 'PREVIEW';
  const network = env === 'LIVE' ? 'mainnet-beta' : 'devnet';

  console.log('[x402] Creating payment middleware:', JSON.stringify({ network, payTo: PROJECT_VAULT_ADDRESS }));

  // Create the faremeter middleware following the documentation pattern
  const paymentMiddleware = await middleware.createMiddleware({
    facilitatorURL: 'https://facilitator.corbits.io',
    accepts: [
      solana.x402Exact({
        network: network as 'devnet' | 'mainnet-beta',
        asset: 'USDC',
        amount: '150000', // $0.15 in USDC base units (6 decimals)
        payTo: PROJECT_VAULT_ADDRESS,
      }),
    ],
  });

  // Apply the faremeter middleware
  // It will either return a 402 response or call next() if payment is verified
  return await paymentMiddleware(c, next);
}
