/**
 * Tarobase Authentication Utilities
 *
 * Provides secure authentication validation for Tarobase ID tokens
 * and wallet address verification for protected API endpoints.
 */

import type { Context } from 'hono';

/**
 * Error types for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Extracts and validates Tarobase authentication from request headers
 *
 * This function performs comprehensive authentication validation for Tarobase users:
 * 1. Extracts wallet address and JWT token from request headers
 * 2. Validates the JWT token by calling Tarobase's API
 * 3. Decodes the JWT to verify the wallet address matches
 *
 * **When to use this function:**
 * - Only for routes that have `requiredAuth: true` or explicitly require authentication
 * - At the beginning of protected API endpoints that need Tarobase user verification
 *
 * **Required request headers:**
 * - `Authorization: Bearer <tarobaseIdToken>` - JWT token from Tarobase login
 * - `X-Wallet-Address: <walletAddress>` - User's wallet address
 *
 * **Usage in API routes:**
 * ```typescript
 * import { validateTarobaseAuth } from './lib/tarobase-auth';
 *
 * app.post('/protected-endpoint', async (c) => {
 *   try {
 *     const { walletAddress, tarobaseIdToken } = await validateTarobaseAuth(c);
 *
 *     // Now you can safely use the validated wallet address
 *     const userProfile = await getUserProfile(walletAddress);
 *     return c.json({ success: true, data: userProfile });
 *   } catch (error) {
 *     if (error instanceof AuthenticationError) {
 *       return c.json({ error: error.message }, error.statusCode);
 *     }
 *     return c.json({ error: 'Internal server error' }, 500);
 *   }
 * });
 * ```
 *
 * **Error handling:**
 * This function throws AuthenticationError with specific error messages:
 * - Missing headers: "Authentication data not found in request"
 * - Invalid token: "Invalid Tarobase token"
 * - Address mismatch: "Token address does not match provided wallet address"
 *
 * @param c - Hono context object containing request headers
 * @param isAdminRoute - Optional flag to check if user has admin access to the Tarobase app
 * @returns Promise<{ walletAddress: string; tarobaseIdToken: string }> - Validated auth data
 * @throws AuthenticationError - If authentication fails at any step
 */
export async function validateTarobaseAuth(
  c: Context,
  isAdminRoute?: boolean,
): Promise<{
  walletAddress: string;
  tarobaseIdToken: string;
}> {
  const { walletAddress, tarobaseIdToken } = getAuthenticatedUser(c);

  // Verify the user is logged in to Tarobase by validating the token
  try {
    const { apps } = await devApi({
      body: {
        action: 'listApps',
      },
      method: 'POST',
      token: tarobaseIdToken,
    });

    // Check admin access if this is an admin route
    if (isAdminRoute) {
      const hasAdminAccess = apps.some(
        ({ _id }: { _id: string }) => _id === process.env.TAROBASE_APP_ID,
      );
      if (!hasAdminAccess) {
        throw new AuthenticationError('Admin access required');
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    console.error('Tarobase token validation failed:', error);
    throw new AuthenticationError('Invalid Tarobase token');
  }

  // Decode JWT and verify that the address inside matches the provided wallet address
  try {
    // The tarobaseIdToken is a JWT, decode it to get the address
    const base64Payload = tarobaseIdToken.split('.')[1];

    // Use TextDecoder for Cloudflare Workers compatibility
    const payload = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(atob(base64Payload), (c) => c.charCodeAt(0))),
    );

    const tokenAddress = payload['custom:walletAddress'];
    if (!tokenAddress || tokenAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new AuthenticationError('Token address does not match provided wallet address');
    }
  } catch (error) {
    console.error('Failed to decode or verify token address:', error);
    throw new AuthenticationError('Failed to verify token address');
  }

  return {
    walletAddress,
    tarobaseIdToken,
  };
}

/**
 * Calls Tarobase Dev API to validate token and perform operations
 */
export async function devApi(params: {
  body?: Record<string, unknown>;
  method: string;
  token: string;
  url?: string;
  headers?: Record<string, string>;
}) {
  const { url = '', body, method, token, headers } = params;
  const TAROBASE_DEV_API_URL = 'https://developer-api.tarobase.com';

  try {
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const response = await fetch(`${TAROBASE_DEV_API_URL}/${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Tarobase API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(text);
    }
  } catch (error) {
    console.error('Error calling Tarobase Dev API:', error);
    throw error;
  }
}

/**
 * Helper function to extract authenticated user data from request
 *
 * @param c - Hono context object
 * @returns { walletAddress: string; tarobaseIdToken: string }
 */
export function getAuthenticatedUser(c: Context): {
  walletAddress: string;
  tarobaseIdToken: string;
} {
  const authHeader = c.req.header('Authorization');
  const walletAddress = c.req.header('X-Wallet-Address');

  if (!authHeader || !walletAddress) {
    throw new AuthenticationError('Authentication data not found in request');
  }

  return {
    walletAddress,
    tarobaseIdToken: authHeader.substring(7), // Remove "Bearer " prefix
  };
}
