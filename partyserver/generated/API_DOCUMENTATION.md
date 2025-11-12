# Poof PartyServer API

Type-safe HTTP API for real-time applications

**Version:** 1.0.0  
**Generated:** 2025-11-12T04:23:46.025Z

## 🔐 Authentication

**Available Strategies:** public, jwt, tarobase  
**Default:** public

## 📊 Standard Status Codes

All endpoints use these standardized status codes:

- **200** (SUCCESS): All successful responses
- **400** (BAD_REQUEST): Client errors (validation, invalid input)
- **401** (UNAUTHORIZED): Authentication/authorization errors
- **404** (NOT_FOUND): Resource not found
- **500** (INTERNAL_ERROR): Server errors (uncaught exceptions)

## 🌐 HTTP Endpoints

### GET /api/scouts/:scoutId/status

Retrieves current scout status from database and polls browser-use API for completion. If task is completed, updates database with results and screenshots. If resultAction is specified, uses Claude with x402-protected email tool to process results and send notifications. Returns immediately with current status.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/scouts/:scoutId/status` |
| **Public** | ✅ Yes |
| **Authentication** | None |
| **Tags** | scouts |
| **Secrets** | None |
| **Status Codes** | 200 |

---

### POST /api/scouts/create

Creates a new scout and immediately starts browser-use session. Creates browser-use session and task, stores scout in database, and returns immediately without waiting for completion. Public endpoint for MCP usage.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/scouts/create` |
| **Public** | ✅ Yes |
| **Authentication** | None |
| **Tags** | scouts |
| **Secrets** | None |
| **Status Codes** | 200 |

---

### GET /health

Retrieves comprehensive system health information including service status, uptime, and connectivity to external services like Tarobase. Use this endpoint to monitor system availability and diagnose potential issues before they affect users.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/health` |
| **Public** | ✅ Yes |
| **Authentication** | None |
| **Tags** | system, monitoring |
| **Secrets** | None |
| **Status Codes** | 200, 500 |
| **Rate Limit** | 100 requests per 60s |

**Response Schema:**
```typescript
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.number(),
  version: z.string(),
  uptime: z.number(),
  services: z.object({
    tarobase: z.object({
      status: z.enum(['connected', 'disconnected', 'error']),
      latency: z.number().optional(),
    })
```

---

