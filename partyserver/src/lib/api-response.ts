/**
 * API Response utilities for consistent response handling
 * These utilities ensure all API responses follow the same format for SDK generation
 */

import type { Context } from 'hono';
import type { ApiErrorCode, ApiResponse } from '../types/api.js';
import { ApiErrorCodes } from '../types/api.js';

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Create a successful API response
 * @param data - The response data
 * @param requestId - Optional request ID for tracing
 */
export function createSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Create an error API response
 * @param code - Error code from ApiErrorCodes
 * @param message - Human-readable error message
 * @param details - Additional error context
 * @param requestId - Optional request ID for tracing
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: any,
  requestId?: string,
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Send a successful JSON response
 * @param c - Hono context
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 */
export function sendSuccess<T>(c: Context, data: T, status: number = 200): Response {
  const requestId = c.get('requestId') || generateRequestId();
  const response = createSuccessResponse(data, requestId);
  return c.json(response, status as any);
}

/**
 * Send an error JSON response
 * @param c - Hono context
 * @param code - Error code from ApiErrorCodes
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Additional error context
 */
export function sendError(
  c: Context,
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: any,
): Response {
  const requestId = c.get('requestId') || generateRequestId();
  const response = createErrorResponse(code, message, details, requestId);

  // Log error for debugging
  console.error(`[${requestId}] API Error:`, {
    code,
    message,
    status,
    details,
    path: c.req.path,
    method: c.req.method,
  });

  return c.json(response, status as any);
}

/**
 * STANDARDIZED STATUS CODES - Only these codes are allowed across all APIs
 */
export const STANDARD_STATUS_CODES = {
  SUCCESS: 200, // All successful responses
  BAD_REQUEST: 400, // Client errors (validation, invalid input, etc.)
  UNAUTHORIZED: 401, // Authentication/authorization errors
  NOT_FOUND: 404, // Resource not found
  INTERNAL_ERROR: 500, // Server errors (uncaught exceptions, system failures)
} as const;

/**
 * Standardized error response helpers - ONLY use these status codes
 */
export const ApiErrors = {
  /**
   * 400 Bad Request - All client-side errors (validation, invalid input, etc.)
   */
  badRequest: (c: Context, message: string = 'Bad request', details?: any) =>
    sendError(
      c,
      ApiErrorCodes.VALIDATION_ERROR,
      message,
      STANDARD_STATUS_CODES.BAD_REQUEST,
      details,
    ),

  /**
   * 401 Unauthorized - All authentication and authorization errors
   */
  unauthorized: (c: Context, message: string = 'Authentication required') =>
    sendError(c, ApiErrorCodes.UNAUTHORIZED, message, STANDARD_STATUS_CODES.UNAUTHORIZED),

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (c: Context, message: string = 'Resource not found') =>
    sendError(c, ApiErrorCodes.RESOURCE_NOT_FOUND, message, STANDARD_STATUS_CODES.NOT_FOUND),

  /**
   * 500 Internal Server Error - All server errors (should be logged)
   */
  internal: (c: Context, message: string = 'Internal server error', details?: any) => {
    // Log internal errors for monitoring
    console.error(`[INTERNAL ERROR] ${message}`, {
      details,
      path: c.req.path,
      method: c.req.method,
    });
    return sendError(
      c,
      ApiErrorCodes.INTERNAL_ERROR,
      message,
      STANDARD_STATUS_CODES.INTERNAL_ERROR,
      details,
    );
  },
};

/**
 * Middleware to add request ID to context
 */
export function requestIdMiddleware() {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = c.req.header('x-request-id') || generateRequestId();
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);
    await next();
  };
}
