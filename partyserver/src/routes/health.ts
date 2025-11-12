/**
 * Health Check API Endpoint
 *
 * @endpoint GET /health
 * @tags system, monitoring
 * @public true
 * @secrets none
 */

import type { Context } from 'hono';
import { z } from 'zod';
import { sendSuccess, ApiErrors, STANDARD_STATUS_CODES } from '../lib/api-response.js';
import { getSystemHealth } from '../lib/health-utils.js';
import type { ApiEndpointConfig } from '../types/api.js';

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.number(),
  version: z.string(),
  uptime: z.number(),
  services: z.object({
    tarobase: z.object({
      status: z.enum(['connected', 'disconnected', 'error']),
      latency: z.number().optional(),
    }),
    partyserver: z.object({
      status: z.enum(['running', 'starting', 'error']),
      activeConnections: z.number(),
    }),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const healthEndpointConfig: ApiEndpointConfig = {
  method: 'GET',
  path: '/health',
  summary: 'System health check',
  description:
    'Retrieves comprehensive system health information including service status, uptime, and connectivity to external services like Tarobase. Use this endpoint to monitor system availability and diagnose potential issues before they affect users.',
  tags: ['system', 'monitoring'],
  requiresAuth: false,
  authDescription: 'No authentication required - publicly accessible for monitoring tools',
  rateLimit: {
    requests: 100,
    window: 60,
  },
  responseSchema: HealthResponseSchema,
  examples: {
    response: {
      status: 'healthy',
      timestamp: 1704067200,
      version: '1.0.0',
      uptime: 86400,
      services: {
        tarobase: {
          status: 'connected',
          latency: 45,
        },
        partyserver: {
          status: 'running',
          activeConnections: 12,
        },
      },
    },
  },
  usageNotes:
    'Call this endpoint regularly (every 30-60 seconds) to monitor system health. A healthy system returns status="healthy" with all services showing positive status. Use this for health checks in load balancers and monitoring systems.',
};

// ═══════════════════════════════════════════════════════════════
// HANDLER - Thin handler calling business logic
// ═══════════════════════════════════════════════════════════════

export async function healthHandler(c: Context): Promise<Response> {
  try {
    const healthData = await getSystemHealth();
    return sendSuccess(c, healthData, STANDARD_STATUS_CODES.SUCCESS);
  } catch (error) {
    return ApiErrors.internal(c, 'Health check failed');
  }
}
