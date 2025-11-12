/**
 * API Routes Registry
 *
 * Central registry for all API endpoints. This file collects all route handlers
 * and their configurations, making it easy to:
 * - Register routes with the Hono app
 * - Generate SDK types and client code
 * - Generate API documentation
 * - Apply middleware consistently
 *
 * Each route handler should be imported here and added to the routes registry.
 */

import type { Hono } from 'hono';
import type { ApiEndpointConfig } from '../types/api';
import { healthHandler, healthEndpointConfig } from './health.js';
import { createScoutHandler, createScoutEndpointConfig } from './scouts-create.js';
import {
  scoutStatusHandler,
  scoutStatusEndpointConfig,
} from './scouts-status.js';

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Route handler function type
 */
export type RouteHandler = (c: any) => Promise<Response> | Response;

/**
 * Route registration information
 */
export interface RouteRegistration {
  config: ApiEndpointConfig;
  handler: RouteHandler;
}

/**
 * Complete route registry with all endpoints
 */
export interface RouteRegistry {
  [routeName: string]: RouteRegistration;
}

// ═══════════════════════════════════════════════════════════════
// ROUTES REGISTRY - Add new routes here
// ═══════════════════════════════════════════════════════════════

/**
 * Master registry of all API routes
 *
 * When adding a new route:
 * 1. Import the handler and config from the route file
 * 2. Add an entry here with a descriptive key
 * 3. The route will be automatically registered and available for SDK generation
 */
export const routes: RouteRegistry = {
  // System & Monitoring Routes
  health: {
    config: healthEndpointConfig,
    handler: healthHandler,
  },

  // Scout Routes
  createScout: {
    config: createScoutEndpointConfig,
    handler: createScoutHandler,
  },

  scoutStatus: {
    config: scoutStatusEndpointConfig,
    handler: scoutStatusHandler,
  },

  // TODO: Add more routes here as they are created
  // Example:
  // numberGame: {
  //   config: numberGameConfig,
  //   handler: numberGameHandler
  // },
  // getUserProfile: {
  //   config: getUserProfileConfig,
  //   handler: getUserProfileHandler
  // },
  // updateUserSettings: {
  //   config: updateUserSettingsConfig,
  //   handler: updateUserSettingsHandler
  // }
};

// ═══════════════════════════════════════════════════════════════
// ROUTE REGISTRATION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Register all routes with a Hono app instance
 * @param app - Hono application instance
 */
export function registerRoutes(app: Hono): void {
  console.log('🔗 Registering API routes...');

  Object.entries(routes).forEach(([routeName, { config, handler }]) => {
    const { method, path } = config;

    // Register the route with Hono based on HTTP method
    switch (method) {
      case 'GET':
        app.get(path, handler);
        break;
      case 'POST':
        app.post(path, handler);
        break;
      case 'PUT':
        app.put(path, handler);
        break;
      case 'DELETE':
        app.delete(path, handler);
        break;
      case 'PATCH':
        app.patch(path, handler);
        break;
      default:
        console.warn(`⚠️  Unknown HTTP method: ${method} for route ${routeName}`);
    }

    console.log(`   ✅ ${method.padEnd(6)} ${path.padEnd(20)} (${routeName})`);
  });

  console.log(`✨ Registered ${Object.keys(routes).length} API routes`);
}

/**
 * Get route configuration by name
 * @param routeName - Name of the route from the registry
 * @returns Route configuration or undefined if not found
 */
export function getRouteConfig(routeName: string): ApiEndpointConfig | undefined {
  return routes[routeName]?.config;
}

/**
 * Get all route configurations (useful for SDK generation)
 * @returns Array of all route configurations with names
 */
export function getAllRouteConfigs(): Array<ApiEndpointConfig & { name: string }> {
  return Object.entries(routes).map(([name, { config }]) => ({
    ...config,
    name,
  }));
}

/**
 * Get routes by tag (useful for organizing SDK methods)
 * @param tag - Tag to filter routes by
 * @returns Array of route configurations matching the tag
 */
export function getRoutesByTag(tag: string): Array<ApiEndpointConfig & { name: string }> {
  return getAllRouteConfigs().filter((config) => config.tags?.includes(tag));
}

/**
 * Generate route summary for debugging/documentation
 * @returns String summary of all registered routes
 */
export function getRoutesSummary(): string {
  const routeCount = Object.keys(routes).length;
  const methodCounts = getAllRouteConfigs().reduce(
    (acc, config) => {
      acc[config.method] = (acc[config.method] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summary = [
    `📊 API Routes Summary:`,
    `   Total routes: ${routeCount}`,
    `   Methods: ${Object.entries(methodCounts)
      .map(([method, count]) => `${method}(${count})`)
      .join(', ')}`,
  ];

  const tags = new Set(getAllRouteConfigs().flatMap((config) => config.tags || []));

  if (tags.size > 0) {
    summary.push(`   Tags: ${Array.from(tags).join(', ')}`);
  }

  return summary.join('\n');
}
