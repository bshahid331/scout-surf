/**
 * Base API types for consistent response handling and SDK generation
 */

import { z } from 'zod';

/**
 * Standard API response wrapper for all endpoints
 * Ensures consistent structure across all API responses for SDK generation
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean().describe('Whether the request was successful'),
    data: dataSchema.optional().describe('Response data when successful'),
    error: z
      .object({
        code: z.string().describe('Error code for programmatic handling'),
        message: z.string().describe('Human-readable error message'),
        details: z.any().optional().describe('Additional error context'),
      })
      .optional()
      .describe('Error information when request fails'),
    timestamp: z.number().describe('Unix timestamp of the response'),
    requestId: z.string().optional().describe('Unique identifier for this request'),
  });

/**
 * Success response type helper
 */
export type ApiResponse<T = any> =
  | {
      success: true;
      data: T;
      timestamp: number;
      requestId?: string;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        details?: any;
      };
      timestamp: number;
      requestId?: string;
    };

/**
 * Common error codes used across the API
 * These will be available in the generated SDK for proper error handling
 */
export const ApiErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Server & System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Business Logic
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',

  // External Services
  TAROBASE_ERROR: 'TAROBASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

/**
 * Base API endpoint configuration
 * Used for SDK generation metadata with full type information
 */
export interface ApiEndpointConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  summary?: string; // Short one-line description for SDK method names
  tags?: string[];
  requiresAuth?: boolean;
  authDescription?: string; // How authentication works for this endpoint
  cronExpression?: string; // Cron expression for scheduled tasks (e.g., "*/5 * * * *")
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  requestSchema?: any; // Zod schema for request validation
  responseSchema?: any; // Zod schema for response validation
  examples?: {
    request?: any;
    response?: any;
  };
  usageNotes?: string; // Additional context for when/how to use this endpoint
}
