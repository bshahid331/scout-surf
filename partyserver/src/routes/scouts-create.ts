/**
 * Scout Creation API Endpoint (Public for MCP usage)
 *
 * @endpoint POST /api/scouts/create
 * @tags scouts
 * @public true
 * @admin false
 * @secrets BROWSER_USE_API_KEY
 */

import type { Context } from 'hono';
import { z } from 'zod';
import { sendSuccess, ApiErrors, STANDARD_STATUS_CODES } from '../lib/api-response.js';
import { setScouts } from '../tarobase.js';
import type { ApiEndpointConfig } from '../types/api.js';

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const CreateScoutRequestSchema = z.object({
  name: z.string().min(1, 'Scout name is required').max(100, 'Scout name too long'),
  instructions: z.string().min(1, 'Instructions are required'),
  resultAction: z.string().optional(),
});

export const CreateScoutResponseSchema = z.object({
  scoutId: z.string(),
  name: z.string(),
  instructions: z.string(),
  resultAction: z.string().optional(),
  status: z.string(),
  sessionId: z.string(),
  liveUrl: z.string(),
  startedAt: z.number(),
});

export type CreateScoutRequest = z.infer<typeof CreateScoutRequestSchema>;
export type CreateScoutResponse = z.infer<typeof CreateScoutResponseSchema>;

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const createScoutEndpointConfig: ApiEndpointConfig = {
  method: 'POST',
  path: '/api/scouts/create',
  summary: 'Create and start a new scout',
  description:
    'Creates a new scout and immediately starts browser-use session. Creates browser-use session and task, stores scout in database, and returns immediately without waiting for completion. Public endpoint for MCP usage.',
  tags: ['scouts'],
  requiresAuth: false,
  requestSchema: CreateScoutRequestSchema,
  responseSchema: CreateScoutResponseSchema,
  examples: {
    request: {
      name: 'Amazon Price Monitor',
      instructions: 'Browse to amazon.com and check the price of iPhone 15',
      resultAction: 'Send me an email if the price drops below $800',
    },
    response: {
      scoutId: 'scout_1704067200_abc123',
      name: 'Amazon Price Monitor',
      instructions: 'Browse to amazon.com and check the price of iPhone 15',
      resultAction: 'Send me an email if the price drops below $800',
      status: 'pending',
      sessionId: 'session_abc123',
      liveUrl: 'https://browser-use.com/session/abc123',
      startedAt: 1704067200,
    },
  },
  usageNotes:
    'Public endpoint - no authentication required. The browser-use session starts immediately but returns before completion. Use GET /api/scouts/:scoutId/status to check progress.',
};

// ═══════════════════════════════════════════════════════════════
// BROWSER-USE API TYPES
// ═══════════════════════════════════════════════════════════════

interface BrowserUseSessionResponse {
  id: string;
  liveUrl: string;
  status: string;
}

interface BrowserUseTaskResponse {
  id: string;
  sessionId: string;
  status: string;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Create scout handler - public endpoint for MCP usage
 */
export async function createScoutHandler(c: Context): Promise<Response> {
  console.log('[Scout] Handler called - public endpoint');
  try {
    // Validate request body
    const body = await c.req.json();
    const validationResult = CreateScoutRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiErrors.badRequest(
        c,
        `Invalid request: ${validationResult.error.issues.map((e) => e.message).join(', ')}`,
      );
    }

    const { name, instructions, resultAction } = validationResult.data;

    // Get wallet address from X-Wallet-Address header
    // NOTE: When x402 middleware is re-enabled, we should verify that the payer
    // address matches this header. Alternatively, the middleware could override
    // this header with the verified payer address for security.
    const walletAddress = c.req.header('X-Wallet-Address');
    if (!walletAddress) {
      return ApiErrors.badRequest(
        c,
        'X-Wallet-Address header is required. Please provide your wallet address.',
      );
    }
    console.log('[Scout] Using wallet address from header:', walletAddress);

    // Get BROWSER_USE_API_KEY from environment
    const apiKey = c.env?.BROWSER_USE_API_KEY;
    if (!apiKey) {
      console.error('[Scout] BROWSER_USE_API_KEY not found in environment');
      return ApiErrors.internal(c, 'Server configuration error');
    }

    // Step 1: Create browser-use session
    let sessionData: BrowserUseSessionResponse;
    try {
      const sessionRes = await fetch('https://api.browser-use.com/api/v2/sessions', {
        method: 'POST',
        headers: {
          'X-Browser-Use-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!sessionRes.ok) {
        const errorText = await sessionRes.text();
        console.error('[Scout] Browser-use session creation failed:', errorText);
        return ApiErrors.internal(c, 'Failed to create browser session');
      }

      sessionData = (await sessionRes.json()) as BrowserUseSessionResponse;
      console.log('[Scout] Browser-use session created:', sessionData.id);
    } catch (error) {
      console.error('[Scout] Browser-use session creation error:', error);
      return ApiErrors.internal(c, 'Failed to create browser session');
    }

    // Step 2: Create task in session
    // Construct task prompt with optional resultAction context
    let taskPrompt = instructions;
    if (resultAction) {
      taskPrompt += `\n\nIMPORTANT NOTE FOR BROWSER AGENT: After you complete this task, the following action will be performed with your output: "${resultAction}"

This is a FUTURE action that you should NOT attempt to perform yourself. However, please ensure your output contains all necessary information to support this follow-up action. For example, if the follow-up involves sending specific data via email, make sure that data is clearly present in your output.`;
    }

    try {
      const taskRes = await fetch('https://api.browser-use.com/api/v2/tasks', {
        method: 'POST',
        headers: {
          'X-Browser-Use-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData.id,
          task: taskPrompt,
        }),
      });

      if (!taskRes.ok) {
        const errorText = await taskRes.text();
        console.error('[Scout] Browser-use task creation failed:', errorText);
        return ApiErrors.internal(c, 'Failed to create browser task');
      }

      const taskData = (await taskRes.json()) as BrowserUseTaskResponse;
      console.log('[Scout] Browser-use task created:', taskData.id);
    } catch (error) {
      console.error('[Scout] Browser-use task creation error:', error);
      return ApiErrors.internal(c, 'Failed to create browser task');
    }

    // Step 3: Generate unique scout ID
    const scoutId = `scout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startedAt = Math.floor(Date.now() / 1000);

    // Step 4: Create scout in database (server-signed via tarobase.ts)
    // Using wallet address from X-Wallet-Address header as userId
    const scoutData = {
      userId: { type: 'address' as const, publicKey: walletAddress },
      name,
      instructions,
      resultAction: resultAction || '',
      status: 'pending',
      sessionId: sessionData.id,
      liveUrl: sessionData.liveUrl,
      startedAt,
    };

    console.log('[Scout] Creating scout with data:', JSON.stringify(scoutData, null, 2));

    const success = await setScouts(scoutId, scoutData);

    console.log('[Scout] Scout creation response:', JSON.stringify({ success, scoutId }, null, 2));

    if (!success) {
      console.error('[Scout] Failed to create scout in Tarobase');
      return ApiErrors.internal(c, 'Failed to save scout to database');
    }

    // Step 5: Return success response immediately
    const response: CreateScoutResponse = {
      scoutId,
      name,
      instructions,
      resultAction: resultAction || '',
      status: 'pending',
      sessionId: sessionData.id,
      liveUrl: sessionData.liveUrl,
      startedAt,
    };

    console.log('[Scout] Scout created successfully:', scoutId);
    return sendSuccess(c, response, STANDARD_STATUS_CODES.SUCCESS);
  } catch (error) {
    console.error('[Scout] Scout creation error:', error);
    return ApiErrors.internal(c, 'Failed to create scout');
  }
}
