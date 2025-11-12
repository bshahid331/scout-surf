/**
 * Scout Status Refresh API Endpoint (Public)
 *
 * @endpoint GET /api/scouts/:scoutId/status
 * @tags scouts
 * @public true
 * @admin false
 * @secrets BROWSER_USE_API_KEY, OPENAI_API_KEY, PROJECT_VAULT_PRIVATE_KEY
 */

import type { Context } from 'hono';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { sendSuccess, ApiErrors, STANDARD_STATUS_CODES } from '../lib/api-response.js';
import { getScouts, updateScouts } from '../tarobase.js';
import type { ApiEndpointConfig } from '../types/api.js';
import axios, { type AxiosInstance } from 'axios';
import { withPaymentInterceptor, createSigner } from 'x402-axios';
import { Keypair } from '@solana/web3.js';
import { PROJECT_VAULT_ADDRESS } from '../constants.js';
import bs58 from 'bs58';

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const ScoutStatusResponseSchema = z.object({
  scoutId: z.string(),
  name: z.string(),
  instructions: z.string(),
  resultAction: z.string().optional(),
  status: z.string(),
  sessionId: z.string().optional(),
  liveUrl: z.string().optional(),
  result: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  screenshots: z.array(z.string()).optional(),
});

export type ScoutStatusResponse = z.infer<typeof ScoutStatusResponseSchema>;

// ═══════════════════════════════════════════════════════════════
// X402 PAYMENT HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Creates an axios instance with x402 payment support using project vault
 * @param c - Hono context for accessing environment variables
 * @param env - Environment string (LIVE = mainnet, else devnet)
 * @returns axios instance with payment interceptor
 */
async function createX402Axios(c: Context, env: string): Promise<AxiosInstance> {
  try {
    // Get PROJECT_VAULT_PRIVATE_KEY from environment
    const vaultPrivateKey = c.env?.PROJECT_VAULT_PRIVATE_KEY;
    if (!vaultPrivateKey) {
      throw new Error('PROJECT_VAULT_PRIVATE_KEY not configured');
    }

    // Determine network based on environment
    const network = env === 'LIVE' ? 'solana-mainnet' : 'solana-devnet';
    console.log(`Setting up x402-axios for network: ${network}`);

    // Parse keypair from vault private key (handles both JSON array and base58 formats)
    let keypair: Keypair;
    try {
      // Try parsing as JSON byte array first (e.g., "[123,45,67,...]")
      const parsed = JSON.parse(vaultPrivateKey);
      if (Array.isArray(parsed)) {
        keypair = Keypair.fromSecretKey(Uint8Array.from(parsed));
      } else {
        throw new Error('Not a byte array');
      }
    } catch {
      // If JSON parse fails, assume it's base58
      keypair = Keypair.fromSecretKey(bs58.decode(vaultPrivateKey));
    }
    console.log(`Payment wallet: ${keypair.publicKey.toString()}`);

    // Convert keypair to base58 string for x402-axios
    const privateKeyBase58 = bs58.encode(keypair.secretKey);

    // Create signer using x402-axios
    const signer = await createSigner(network as 'solana-devnet' | 'solana-mainnet', privateKeyBase58);

    // Create axios instance with payment interceptor
    const axiosWithPayment = withPaymentInterceptor(
      axios.create({
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      signer
    );

    console.log('x402-axios payment interceptor created successfully');

    return axiosWithPayment;
  } catch (error) {
    console.error('Failed to create x402-axios instance:', error);
    throw new Error(`x402-axios setup failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const scoutStatusEndpointConfig: ApiEndpointConfig = {
  method: 'GET',
  path: '/api/scouts/:scoutId/status',
  summary: 'Get scout status and check for completion',
  description:
    'Retrieves current scout status from database and polls browser-use API for completion. If task is completed, updates database with results and screenshots. If resultAction is specified, uses Claude with x402-protected email tool to process results and send notifications. Returns immediately with current status.',
  tags: ['scouts'],
  requiresAuth: false,
  requestSchema: z.object({}),
  responseSchema: ScoutStatusResponseSchema,
  examples: {
    request: {},
    response: {
      scoutId: 'scout_1704067200_abc123',
      name: 'Amazon Price Monitor',
      instructions: 'Browse to amazon.com and check the price of iPhone 15',
      resultAction: 'Send me an email if the price drops below $800',
      status: 'completed',
      sessionId: 'session_abc123',
      liveUrl: 'https://browser-use.com/session/abc123',
      result: 'The current price of iPhone 15 on Amazon is $799',
      startedAt: 1704067200,
      completedAt: 1704067500,
      screenshots: [
        'https://browser-use.com/screenshots/step1.png',
        'https://browser-use.com/screenshots/step2.png',
      ],
    },
  },
  usageNotes:
    'Public endpoint - no authentication required. Call this endpoint periodically to check if scout has completed. Poll every 5-10 seconds. Status values: "pending" (just started), "running" (in progress), "completed" (finished successfully), "error" (failed). Screenshots are included when task completes. If resultAction includes email requests, Claude will automatically send emails using x402-protected API with project vault funds.',
};

// ═══════════════════════════════════════════════════════════════
// BROWSER-USE API TYPES
// ═══════════════════════════════════════════════════════════════

interface BrowserUseTask {
  id: string;
  sessionId: string;
  status: string;
  output?: string;
  finishedAt?: string;
}

interface BrowserUseSessionData {
  id: string;
  status: string;
  tasks?: BrowserUseTask[];
}

interface BrowserUseTaskStep {
  screenshotUrl?: string;
}

interface BrowserUseTaskDetail {
  id: string;
  steps?: BrowserUseTaskStep[];
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export async function scoutStatusHandler(c: Context): Promise<Response> {
  try {
    // Get scoutId from URL params
    const scoutId = c.req.param('scoutId');

    if (!scoutId) {
      return ApiErrors.badRequest(c, 'Scout ID is required');
    }

    // Fetch the scout from database
    const scoutData = await getScouts(scoutId);

    if (!scoutData) {
      return ApiErrors.notFound(c, 'Scout not found');
    }

    // Cast to any to work around incomplete type definitions
    const scout = scoutData as any;

    // If scout has no sessionId, return current scout data
    if (!scout.sessionId) {
      const response: ScoutStatusResponse = {
        scoutId: scout.id,
        name: scout.name,
        instructions: scout.instructions,
        resultAction: scout.resultAction,
        status: scout.status,
        result: scout.result,
        error: scout.error,
        startedAt: scout.startedAt,
        completedAt: scout.completedAt,
      };
      return sendSuccess(c, response, STANDARD_STATUS_CODES.SUCCESS);
    }

    // If scout status is already completed or error, return current data
    if (scout.status === 'completed' || scout.status === 'error') {
      const response: ScoutStatusResponse = {
        scoutId: scout.id,
        name: scout.name,
        instructions: scout.instructions,
        resultAction: scout.resultAction,
        status: scout.status,
        sessionId: scout.sessionId,
        liveUrl: scout.liveUrl,
        result: scout.result,
        error: scout.error,
        startedAt: scout.startedAt,
        completedAt: scout.completedAt,
      };
      return sendSuccess(c, response, STANDARD_STATUS_CODES.SUCCESS);
    }

    // Get BROWSER_USE_API_KEY from environment
    const apiKey = c.env?.BROWSER_USE_API_KEY;
    if (!apiKey) {
      console.error('BROWSER_USE_API_KEY not found in environment');
      return ApiErrors.internal(c, 'Server configuration error');
    }

    // Fetch browser-use session status
    let sessionData: BrowserUseSessionData;
    try {
      const response = await fetch(
        `https://api.browser-use.com/api/v2/sessions/${scout.sessionId}`,
        {
          method: 'GET',
          headers: {
            'X-Browser-Use-API-Key': apiKey,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch browser-use session:', errorText);
        // Don't fail - just return current status
        const fallbackResponse: ScoutStatusResponse = {
          scoutId: scout.id,
          name: scout.name,
          instructions: scout.instructions,
          resultAction: scout.resultAction,
          status: scout.status,
          sessionId: scout.sessionId,
          liveUrl: scout.liveUrl,
          result: scout.result,
          error: scout.error,
          startedAt: scout.startedAt,
          completedAt: scout.completedAt,
        };
        return sendSuccess(c, fallbackResponse, STANDARD_STATUS_CODES.SUCCESS);
      }

      sessionData = (await response.json()) as BrowserUseSessionData;
    } catch (error) {
      console.error('Browser-use session fetch error:', error);
      // Don't fail - just return current status
      const fallbackResponse: ScoutStatusResponse = {
        scoutId: scout.id,
        name: scout.name,
        instructions: scout.instructions,
        resultAction: scout.resultAction,
        status: scout.status,
        sessionId: scout.sessionId,
        liveUrl: scout.liveUrl,
        result: scout.result,
        error: scout.error,
        startedAt: scout.startedAt,
        completedAt: scout.completedAt,
      };
      return sendSuccess(c, fallbackResponse, STANDARD_STATUS_CODES.SUCCESS);
    }

    // Get first task
    const firstTask = sessionData.tasks?.[0];
    const isCompleted = firstTask && firstTask.finishedAt;

    // If task is not completed, update status to "running" and return
    if (!isCompleted) {
      if (scout.status !== 'running') {
        await updateScouts(scoutId, { status: 'running' });
      }

      const response: ScoutStatusResponse = {
        scoutId: scout.id,
        name: scout.name,
        instructions: scout.instructions,
        resultAction: scout.resultAction,
        status: 'running',
        sessionId: scout.sessionId,
        liveUrl: scout.liveUrl,
        startedAt: scout.startedAt,
      };
      return sendSuccess(c, response, STANDARD_STATUS_CODES.SUCCESS);
    }

    // Task completed - fetch detailed task info for screenshots
    let screenshots: string[] = [];
    try {
      const taskDetailResponse = await fetch(
        `https://api.browser-use.com/api/v2/tasks/${firstTask.id}`,
        {
          method: 'GET',
          headers: {
            'X-Browser-Use-API-Key': apiKey,
          },
        },
      );

      if (taskDetailResponse.ok) {
        const taskDetail = (await taskDetailResponse.json()) as BrowserUseTaskDetail;
        screenshots = (taskDetail.steps || [])
          .map((step) => step.screenshotUrl)
          .filter((url): url is string => !!url);
      }
    } catch (error) {
      console.error('Failed to fetch task screenshots:', error);
      // Continue without screenshots
    }

    // Determine if task succeeded or failed
    const taskOutput = firstTask.output || '';
    const taskSucceeded = firstTask.status !== 'failed' && firstTask.status !== 'error';

    // Process with OpenAI if resultAction exists
    let finalResult = taskOutput;
    if (taskSucceeded && scout.resultAction) {
      console.log(`Processing scout ${scoutId} result with OpenAI GPT-5`);
      try {
        const openaiApiKey = c.env?.OPENAI_API_KEY;
        if (!openaiApiKey) {
          console.warn('OPENAI_API_KEY not found - skipping OpenAI processing');
        } else {
          // Set API key in environment for the model
          process.env.OPENAI_API_KEY = openaiApiKey;

          // Determine email API URL based on environment
          const env = c.env?.ENV || 'PREVIEW';
          const emailApiUrl = env === 'LIVE'
            ? 'https://6912ea0975594657e0105644-api.poof.new'
            : 'https://6912ea0975594657e0105643-api.poof.new';

          console.log(`Using email API URL: ${emailApiUrl} (ENV: ${env})`);

          // Check if PROJECT_VAULT_PRIVATE_KEY is available
          const vaultPrivateKey = c.env?.PROJECT_VAULT_PRIVATE_KEY;
          console.log(`[OpenAI Setup] vaultPrivateKey available: ${!!vaultPrivateKey}`);
          if (!vaultPrivateKey) {
            console.warn('PROJECT_VAULT_PRIVATE_KEY not found - email tool will not be available');
          }

          // Create sendEmail tool with x402 payment support
          console.log('[OpenAI Setup] Defining sendEmail tool');
          const sendEmail = {
            description: 'Send an email via x402 protected API. Use this when the user requests email notifications.',
            inputSchema: z.object({
              to: z.string().describe('Recipient email address'),
              subject: z.string().describe('Email subject line'),
              html: z.string().describe('HTML email body'),
            }),
            execute: async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
              console.log(`[OpenAI Tool] sendEmail called - to: ${to}, subject: ${subject}`);

              if (!vaultPrivateKey) {
                const errorMsg = 'PROJECT_VAULT_PRIVATE_KEY not configured - cannot send email';
                console.error(`[OpenAI Tool] ${errorMsg}`);
                throw new Error(errorMsg);
              }

              try {
                // TEST: Make a simple call without x402 wrapper first
                console.log('[TEST] Making simple axios call WITHOUT x402 wrapper to check endpoint availability...');
                console.log(`[TEST] Target URL: ${emailApiUrl}/api/send-email`);
                try {
                  const testResponse = await axios.post(`${emailApiUrl}/api/send-email`, {
                    to,
                    subject,
                    html,
                  });
                  console.log(`[TEST] Simple axios call completed - Status Code: ${testResponse.status}`);
                  console.log(`[TEST] Response data:`, JSON.stringify(testResponse.data, null, 2));
                } catch (testError) {
                  if (axios.isAxiosError(testError)) {
                    console.log(`[TEST] Simple axios call failed - Status Code: ${testError.response?.status || 'NO_RESPONSE'}`);
                    console.log(`[TEST] Error response:`, JSON.stringify(testError.response?.data, null, 2));
                  } else {
                    console.log(`[TEST] Simple axios call failed - Error:`, testError);
                  }
                }
                console.log('[TEST] Test call completed, now proceeding with x402 protected call...');

                // Create x402-enabled axios instance using helper function
                console.log('[OpenAI Tool] Creating x402 axios instance');
                const axiosWithPayment = await createX402Axios(c, env);

                // Make x402 protected request
                console.log(`[OpenAI Tool] Sending x402 request to ${emailApiUrl}/api/send-email`);
                const response = await axiosWithPayment.post(`${emailApiUrl}/api/send-email`, {
                  to,
                  subject,
                  html,
                });

                console.log(`[OpenAI Tool] Email sent successfully:`, JSON.stringify(response.data, null, 2));
                return response.data;
              } catch (error) {
                console.error('[OpenAI Tool] Email sending failed:', error);

                // Extract axios error details
                if (axios.isAxiosError(error)) {
                  console.error('[OpenAI Tool] Axios error details:', JSON.stringify({
                    message: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    headers: error.response?.headers,
                  }, null, 2));
                } else {
                  console.error('[OpenAI Tool] Error details:', JSON.stringify({
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    name: error instanceof Error ? error.name : undefined,
                  }, null, 2));
                }
                throw error;
              }
            },
          };

          try {
            const generateTextParams: any = {
              model: openai('gpt-5'),
              tools: {
                sendEmail,
              },
              prompt: `You are processing the output of a browser automation task. The user wants you to: ${scout.resultAction}

Browser Run Output:
${taskOutput}

Please process this information according to the user's request and provide a clear, actionable response. If the user's request involves sending an email, use the sendEmail tool.`,
            };

            // Try to add maxSteps if available in this AI SDK version
            try {
              generateTextParams.maxSteps = 10;
            } catch (e) {
              console.log('[OpenAI Setup] maxSteps not available in this AI SDK version');
            }

            // Log full generateText parameters
            console.log('[OpenAI Request] Full parameters:', JSON.stringify({
              model: 'gpt-5',
              hasTools: !!generateTextParams.tools,
              toolNames: Object.keys(generateTextParams.tools || {}),
              promptLength: generateTextParams.prompt.length,
              maxSteps: generateTextParams.maxSteps,
              openaiApiKeyPresent: !!openaiApiKey,
            }, null, 2));

            console.log('[OpenAI Request] Full prompt being sent:');
            console.log('---START PROMPT---');
            console.log(generateTextParams.prompt);
            console.log('---END PROMPT---');

            console.log('[OpenAI Request] Calling generateText...');
            const { text } = await generateText(generateTextParams);

            console.log('[OpenAI Response] Text received:', text);

            // Combine both results
            finalResult = `=== Browser Run Output ===
${taskOutput}

=== Result Action Processing ===
${text}`;
            console.log(`[OpenAI Success] Processing completed for scout ${scoutId}`);
          } catch (error) {
            console.error('[OpenAI Error] Processing with tools failed');
            console.error('[OpenAI Error] Error type:', error?.constructor?.name);
            console.error('[OpenAI Error] Error message:', error instanceof Error ? error.message : String(error));
            console.error('[OpenAI Error] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

            // Log full error object
            console.error('[OpenAI Error] Full error object:', JSON.stringify({
              message: error instanceof Error ? error.message : String(error),
              name: error instanceof Error ? error.name : undefined,
              stack: error instanceof Error ? error.stack : undefined,
              // @ts-ignore - Check for Error.cause (ES2022)
              cause: error instanceof Error ? error.cause : undefined,
              // @ts-ignore - Check for AI SDK specific error properties
              code: error?.code,
              // @ts-ignore
              statusCode: error?.statusCode,
              // @ts-ignore
              response: error?.response,
              // @ts-ignore
              isRetryError: error?.isRetryError,
              // @ts-ignore
              retryCount: error?.retryCount,
              // @ts-ignore
              lastAttemptError: error?.lastAttemptError,
            }, null, 2));

            // Log all error properties
            if (error && typeof error === 'object') {
              console.error('[OpenAI Error] All error properties:', Object.keys(error));
              console.error('[OpenAI Error] Error prototype:', Object.getPrototypeOf(error)?.constructor?.name);
            }

            // Fall back to original taskOutput if OpenAI fails
            console.log(`[OpenAI Fallback] Using original browser output for scout ${scoutId}`);
          }
        }
      } catch (error) {
        console.error('OpenAI processing failed:', error);
        // Fall back to original taskOutput if OpenAI fails
        console.log(`Using original browser output for scout ${scoutId}`);
      }
    }

    // Update scout in database
    const completedAt = Math.floor(Date.now() / 1000);
    const updateData = taskSucceeded
      ? {
          status: 'completed',
          result: finalResult,
          completedAt,
          screenshots: screenshots.length > 0 ? JSON.stringify(screenshots) : undefined,
        }
      : {
          status: 'error',
          error: taskOutput || 'Task failed',
          completedAt,
          screenshots: screenshots.length > 0 ? JSON.stringify(screenshots) : undefined,
        };

    await updateScouts(scoutId, updateData);

    const response: ScoutStatusResponse = {
      scoutId: scout.id,
      name: scout.name,
      instructions: scout.instructions,
      resultAction: scout.resultAction,
      status: taskSucceeded ? 'completed' : 'error',
      sessionId: scout.sessionId,
      liveUrl: scout.liveUrl,
      result: taskSucceeded ? finalResult : undefined,
      error: taskSucceeded ? undefined : (taskOutput || 'Task failed'),
      startedAt: scout.startedAt,
      completedAt,
      screenshots: screenshots.length > 0 ? screenshots : undefined,
    };

    console.log(`Scout ${scoutId} completed with status: ${response.status}`);
    return sendSuccess(c, response, STANDARD_STATUS_CODES.SUCCESS);
  } catch (error) {
    console.error('Scout status check error:', error);
    return ApiErrors.internal(c, 'Failed to check scout status');
  }
}
