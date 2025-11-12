/**
 * Health Check Business Logic
 *
 * Composable utility functions for health checking that can be used across routes.
 * These functions contain the actual business logic, while route handlers stay thin.
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  uptime: number;
  services: {
    tarobase: {
      status: 'connected' | 'disconnected' | 'error';
      latency?: number;
    };
    partyserver: {
      status: 'running' | 'starting' | 'error';
      activeConnections: number;
    };
  };
}

/**
 * Check Tarobase SDK health
 */
export async function checkTarobaseHealth(): Promise<HealthStatus['services']['tarobase']> {
  try {
    // TODO: Implement actual Tarobase health check
    return {
      status: 'connected',
      latency: 45,
    };
  } catch (error) {
    console.error('Tarobase health check failed:', error);
    return { status: 'error' };
  }
}

/**
 * Check PartyServer health
 */
export function checkPartyServerHealth(): HealthStatus['services']['partyserver'] {
  try {
    // TODO: Get actual connection count
    return {
      status: 'running',
      activeConnections: 0,
    };
  } catch (error) {
    console.error('PartyServer health check failed:', error);
    return {
      status: 'error',
      activeConnections: 0,
    };
  }
}

/**
 * Calculate overall system health
 */
export function calculateOverallHealth(services: HealthStatus['services']): HealthStatus['status'] {
  const hasErrors = Object.values(services).some(
    (service) => service.status === 'error' || service.status === 'disconnected',
  );

  if (hasErrors) return 'degraded';

  const allHealthy = Object.values(services).every(
    (service) => service.status === 'connected' || service.status === 'running',
  );

  return allHealthy ? 'healthy' : 'degraded';
}

/**
 * Get complete system health status
 */
export async function getSystemHealth(): Promise<HealthStatus> {
  const [tarobaseHealth, partyServerHealth] = await Promise.all([
    checkTarobaseHealth(),
    checkPartyServerHealth(),
  ]);

  const services = {
    tarobase: tarobaseHealth,
    partyserver: partyServerHealth,
  };

  return {
    status: calculateOverallHealth(services),
    timestamp: Date.now(),
    version: '1.0.0', // TODO: Get from package.json
    uptime: process.uptime(),
    services,
  };
}
