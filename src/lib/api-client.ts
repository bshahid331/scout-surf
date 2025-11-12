/**
 * Generated API Client SDK
 * HTTP REST API endpoints with full TypeScript types
 * 
 * Generated at: 2025-11-10T21:25:46.367Z
 */

// ═══════════════════════════════════════════════════════════════
// BASE TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  requestId?: string;
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT-SPECIFIC TYPES
// ═══════════════════════════════════════════════════════════════

// System health check
export type HealthRequest = void;
export type HealthResponse = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  uptime: number;
  services: {
  tarobase: {
  status: 'connected' | 'disconnected' | 'error';
  latency?: number | undefined;
};
  partyserver: {
  status: 'running' | 'starting' | 'error';
  activeConnections: number;
};
};
};

// Create a new scout (FREE)
export type CreateScoutRequest = {
  name: string;
  instructions: string;
  resultAction?: string | undefined;
};
export type CreateScoutResponse = {
  scoutId: string;
  userId: string;
  name: string;
  description: string;
  status: string;
  instructions: string;
  resultAction?: string | undefined;
  createdAt: number;
};

// Run a scout (paid)
export type RunScoutRequest = {

};
export type RunScoutResponse = {
  runId: string;
  scoutId: string;
  userId: string;
  status: string;
  startedAt: number;
  result: string | null;
  error: string | null;
  completedAt: number | null;
};

export interface ApiClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  adminAuth?: {
    token: string;
    walletAddress: string;
  };
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ═══════════════════════════════════════════════════════════════
// HTTP API CLIENT
// ═══════════════════════════════════════════════════════════════

export class ApiClient {
  constructor(private config: ApiClientConfig) {}

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    isAdminRoute?: boolean
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    // Add admin headers if this is an admin route and we have admin auth
    if (isAdminRoute && this.config.adminAuth) {
      headers['Authorization'] = `Bearer ${this.config.adminAuth.token}`;
      headers['X-Wallet-Address'] = this.config.adminAuth.walletAddress;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout || 300000)
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new ApiError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An unknown error occurred',
        data.error?.details,
        response
      );
    }

    return data.data!;
  }

  /**
   * System health check
   * 
   * Retrieves comprehensive system health information including service status, uptime, and connectivity to external services like Tarobase. Use this endpoint to monitor system availability and diagnose potential issues before they affect users.
   * 
   * @auth Not required - No authentication required - publicly accessible for monitoring tools
   * @rateLimit 100 requests per 60 seconds
   * @usage Call this endpoint regularly (every 30-60 seconds) to monitor system health. A healthy system returns status="healthy" with all services showing positive status. Use this for health checks in load balancers and monitoring systems.
   * 
   * @tags system, monitoring
   * 
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', `/health`, false);
  }

  /**
   * Create a new scout (FREE)
   * 
   * Creates a new scout for the authenticated user. Scout creation is free - payment is only required when running the scout. The scout will be stored in the Tarobase database.
   * 
   * @auth Required - Requires Tarobase authentication (user route)
   * 
   * @usage Scout creation is free. Payment ($0.10 USDC) is required only when running the scout via POST /api/scouts/:scoutId/run.
   * 
   * @tags scouts
   * @example
   * ```typescript
   * const result = await api.createScout({
  "name": "Amazon Price Monitor",
  "instructions": "Browse to amazon.com and check the price of iPhone 15",
  "resultAction": "Send me an email if the price drops below $800"
});
   * ```
   */
  async createScout(request: CreateScoutRequest): Promise<CreateScoutResponse> {
    return this.request<CreateScoutResponse>('POST', `/api/scouts/create`, request, false);
  }

  /**
   * Run a scout (paid)
   * 
   * Executes a scout with x402 payment protection. Requires $0.10 USDC payment on Solana. User must own the scout. Creates a new run record and returns the run ID.
   * 
   * @auth Required - Requires Tarobase authentication (user route)
   * 
   * @usage This endpoint is protected by x402 payment protocol. Cost: $0.10 USDC. Payment is automatically handled by the frontend client. Network auto-detected (devnet for preview, mainnet-beta for production). The scout must exist and belong to the authenticated user.
   * 
   * @tags scouts, x402, payments
   * @example
   * ```typescript
   * const result = await api.runScout('scoutId-value', {});
   * ```
   */
  async runScout(scoutId: string, request: RunScoutRequest): Promise<RunScoutResponse> {
    return this.request<RunScoutResponse>('POST', `/api/scouts/${scoutId}/run`, request, false);
  }
}

// ═══════════════════════════════════════════════════════════════
// FACTORY AND EXPORTS
// ═══════════════════════════════════════════════════════════════

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

import { PARTYSERVER_URL } from '@/lib/config';

/**
 * Default API client instance
 */
export const api = createApiClient({
  baseUrl: `https://${PARTYSERVER_URL}`
});

/**
 * Create API client with admin authentication
 * This client automatically detects admin routes and adds auth headers
 * 
 * @example
 * ```typescript
 * import { useAuth } from '@pooflabs/web';
 * 
 * const { user } = useAuth();
 * const authenticatedApi = createAuthenticatedApiClient({
 *   token: user?.idToken,
 *   walletAddress: user?.address
 * });
 * 
 * // Public routes work normally
 * const health = await authenticatedApi.health();
 * 
 * // Admin routes automatically include auth headers
 * const adminResult = await authenticatedApi.adminRoute();
 * ```
 */
export function createAuthenticatedApiClient(auth: { token: string; walletAddress: string }) {
  return createApiClient({
    baseUrl: `https://${PARTYSERVER_URL}`,
    adminAuth: {
      token: auth.token,
      walletAddress: auth.walletAddress
    }
  });
  }

// Named exports
export { createAuthenticatedApiClient as createAdminApiClient };

// Default export
export default api;
