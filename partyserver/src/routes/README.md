# API Routes Structure

This directory contains the organized API route handlers designed for easy SDK generation and maintainability.

## 🏗️ Architecture Overview

Each API endpoint is structured to be:

- **Self-contained**: One file = one main endpoint function
- **Type-safe**: Full TypeScript support with Zod schemas
- **Documented**: Rich JSDoc comments for SDK generation
- **Composable**: Functions can call each other for complex operations
- **Consistent**: Standardized response format across all endpoints

## 📁 File Structure

```
src/routes/
├── README.md          # This file - documentation
├── index.ts           # Route registry and registration utilities
├── health.ts          # Example: Health check endpoint
└── [feature].ts       # Additional endpoints (one per file)
```

## 🔧 Adding a New Route

Follow these steps to add a new API endpoint:

### 1. Create the Route File

Create a new file in `/src/routes/` following this template:

````typescript
/**
 * [Endpoint Name] API Endpoint
 *
 * [Detailed description of what this endpoint does]
 *
 * @endpoint [METHOD] [PATH]
 * @tags [tag1], [tag2]
 * @public [true/false]
 * @rateLimit [requests] requests per [seconds] seconds
 */

import type { Context } from 'hono';
import { z } from 'zod';
import { sendSuccess, ApiErrors } from '../lib/api-response';
import type { ApiEndpointConfig } from '../types/api';

// ═══════════════════════════════════════════════════════════════
// INPUT/OUTPUT SCHEMAS - Used for SDK type generation
// ═══════════════════════════════════════════════════════════════

export const YourRequestSchema = z.object({
  // Define input schema here
});

export const YourResponseSchema = z.object({
  // Define output schema here
});

export type YourRequest = z.infer<typeof YourRequestSchema>;
export type YourResponse = z.infer<typeof YourResponseSchema>;

// ═══════════════════════════════════════════════════════════════
// ENDPOINT CONFIGURATION - Metadata for SDK generation
// ═══════════════════════════════════════════════════════════════

export const yourEndpointConfig: ApiEndpointConfig = {
  method: 'GET', // or POST, PUT, DELETE, PATCH
  path: '/your-path',
  description: 'Brief description for SDK documentation',
  tags: ['your-tags'],
  requiresAuth: false, // or true
  rateLimit: {
    requests: 100,
    window: 60,
  },
};

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER - Main endpoint implementation
// ═══════════════════════════════════════════════════════════════

/**
 * [Endpoint name] handler
 *
 * [Detailed description including usage examples]
 *
 * @param c - Hono request context
 * @returns Promise resolving to API response
 *
 * @example
 * ```typescript
 * // Example SDK usage (will be generated):
 * const result = await api.yourEndpoint({ param: 'value' });
 * ```
 */
export async function yourHandler(c: Context): Promise<Response> {
  try {
    // Your implementation here
    const data = { message: 'Hello World' };
    return sendSuccess(c, data);
  } catch (error) {
    return ApiErrors.internal(c, 'Something went wrong');
  }
}
````

### 2. Register the Route

Add your route to `/src/routes/index.ts`:

```typescript
import { yourHandler, yourEndpointConfig } from './your-file';

export const routes: RouteRegistry = {
  // ... existing routes
  yourEndpoint: {
    config: yourEndpointConfig,
    handler: yourHandler,
  },
};
```

### 3. That's It!

Your route is now:

- ✅ Automatically registered with the Hono app
- ✅ Available for SDK generation
- ✅ Included in API documentation
- ✅ Following consistent patterns

## 📋 Best Practices

### 1. **Rich Documentation**

```typescript
/**
 * Comprehensive JSDoc comment explaining:
 * - What the endpoint does
 * - Usage examples
 * - Error conditions
 * - SDK usage examples
 */
```

### 2. **Strong Typing**

```typescript
// Always define input/output schemas
export const RequestSchema = z.object({...});
export const ResponseSchema = z.object({...});
export type Request = z.infer<typeof RequestSchema>;
export type Response = z.infer<typeof ResponseSchema>;
```

### 3. **Consistent Error Handling**

```typescript
// Use predefined error helpers
return ApiErrors.badRequest(c, 'Invalid input');
return ApiErrors.notFound(c, 'Resource not found');
return ApiErrors.internal(c, 'Server error');
```

### 4. **Composable Functions**

```typescript
// Export utility functions for reuse
export async function getUserById(id: string): Promise<User> {
  // Implementation that other routes can use
}
```

### 5. **Validation**

```typescript
// Validate inputs and outputs
const input = RequestSchema.parse(await c.req.json());
const output = ResponseSchema.parse(processedData);
return sendSuccess(c, output);
```

## 🎯 SDK Generation Ready

This structure is designed to make SDK generation straightforward:

- **Route Registry**: `/src/routes/index.ts` provides metadata for all endpoints
- **Type Schemas**: Zod schemas can be converted to TypeScript types
- **JSDoc Comments**: Rich documentation transfers to SDK
- **Consistent Responses**: All endpoints follow the same response format
- **Error Codes**: Standardized error handling across all endpoints

## 🔍 Example: Health Check

See `/src/routes/health.ts` for a complete example that demonstrates:

- ✅ Comprehensive documentation
- ✅ Input/output type definitions
- ✅ Error handling
- ✅ Composable utility functions
- ✅ SDK-ready structure

## 🚀 Future Enhancements

This structure enables:

- **Automatic SDK Generation**: Types and client code generation
- **API Documentation**: Auto-generated docs from JSDoc comments
- **Validation Middleware**: Automatic request/response validation
- **Rate Limiting**: Per-endpoint rate limiting configuration
- **Monitoring**: Endpoint-specific metrics and logging
