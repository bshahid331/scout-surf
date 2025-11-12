/**
 * Generated API Client SDK
 * HTTP REST API endpoints with full TypeScript types
 * 
 * Generated at: 2025-11-12T03:20:13.861Z
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

// Create and start a new scout
export type CreateScoutRequest = {
  name: string;
  instructions: string;
  resultAction?: string | undefined;
};
export type CreateScoutResponse = {
  scoutId: string;
  name: string;
  instructions: string;
  resultAction?: string | undefined;
  status: string;
  sessionId: string;
  liveUrl: string;
  startedAt: number;
};

// Get scout status and check for completion
export type ScoutStatusRequest = {

};
export type ScoutStatusResponse = {
  scoutId: string;
  name: string;
  instructions: string;
  resultAction?: string | undefined;
  status: string;
  sessionId?: string | undefined;
  liveUrl?: string | undefined;
  result?: string | undefined;
  error?: string | undefined;
  startedAt?: number | undefined;
  completedAt?: number | undefined;
  screenshots?: string[] | undefined;
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
   * Create and start a new scout
   * 
   * Creates a new scout and immediately starts browser-use session. Creates browser-use session and task, stores scout in database, and returns immediately without waiting for completion. Public endpoint for MCP usage.
   * 
   * @auth Not required - Public endpoint
   * 
   * @usage Public endpoint - no authentication required. The browser-use session starts immediately but returns before completion. Use GET /api/scouts/:scoutId/status to check progress.
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
   * Get scout status and check for completion
   * 
   * Retrieves current scout status from database and polls browser-use API for completion. If task is completed, updates database with results and screenshots. If resultAction is specified, uses Claude with x402-protected email tool to process results and send notifications. Returns immediately with current status.
   * 
   * @auth Not required - Public endpoint
   * 
   * @usage Public endpoint - no authentication required. Call this endpoint periodically to check if scout has completed. Poll every 5-10 seconds. Status values: "pending" (just started), "running" (in progress), "completed" (finished successfully), "error" (failed). Screenshots are included when task completes. If resultAction includes email requests, Claude will automatically send emails using x402-protected API with project vault funds.
   * 
   * @tags scouts
   * @example
   * ```typescript
   * const result = await api.scoutStatus('scoutId-value', {});
   * ```
   */
  async scoutStatus(scoutId: string): Promise<ScoutStatusResponse> {
    return this.request<ScoutStatusResponse>('GET', `/api/scouts/${scoutId}/status`, false);
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
