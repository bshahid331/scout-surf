/**
 * MCP (Model Context Protocol) HTTP Endpoint
 *
 * @endpoint POST /api/mcp
 * @tags mcp, ai-agents
 * @public true
 * @admin false
 * @secrets none
 *
 * Exposes MCP protocol over HTTP for AI agents to discover and call scout operations.
 */

import type { Context } from 'hono';
import { z } from 'zod';
import { sendSuccess, ApiErrors, STANDARD_STATUS_CODES } from '../lib/api-response.js';
import { createMCPServer, type MCPToolRequest, type MCPToolResponse } from '../mcp-server.js';
import type { ApiEndpointConfig } from '../types/api.js';

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

const MCPRequestSchema = z.object({
  method: z.enum(['tools/list', 'tools/call']),
  params: z
    .object({
      name: z.string().optional(),
      arguments: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
});

const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()),
  }),
});

const MCPListResponseSchema = z.object({
  tools: z.array(MCPToolSchema),
});

const MCPCallResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
  ),
  isError: z.boolean().optional(),
});

export type MCPRequest = z.infer<typeof MCPRequestSchema>;
export type MCPListResponse = z.infer<typeof MCPListResponseSchema>;
export type MCPCallResponse = z.infer<typeof MCPCallResponseSchema>;

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const mcpEndpointConfig: ApiEndpointConfig = {
  method: 'POST',
  path: '/api/mcp',
  summary: 'MCP protocol endpoint for AI agents',
  description:
    'Model Context Protocol (MCP) endpoint that exposes scout operations as tools for AI agents. Supports two methods: tools/list (discover available tools) and tools/call (execute a tool). This is a public endpoint that AI agents can use to interact with the scout system.',
  tags: ['mcp', 'ai-agents'],
  requiresAuth: false,
  authDescription: 'Public endpoint - authentication handled per-tool via authToken parameter',
  requestSchema: MCPRequestSchema,
  responseSchema: MCPListResponseSchema,
  examples: {
    request: {
      method: 'tools/list',
    },
    response: {
      tools: [
        {
          name: 'create_scout',
          description: 'Create a new scout with instructions for web automation',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the scout/task' },
              instructions: { type: 'string', description: 'What the scout should do' },
              authToken: { type: 'string', description: 'JWT authentication token' },
            },
            required: ['name', 'instructions', 'authToken'],
          },
        },
        {
          name: 'run_scout',
          description: 'Execute a scout (costs $0.10 USDC)',
          inputSchema: {
            type: 'object',
            properties: {
              scoutId: { type: 'string', description: 'ID of the scout to run' },
              authToken: { type: 'string', description: 'JWT authentication token' },
            },
            required: ['scoutId', 'authToken'],
          },
        },
      ],
    },
  },
  usageNotes:
    'This endpoint follows the Model Context Protocol (MCP) specification. Use tools/list to discover available tools and tools/call to execute them. The create_scout tool is FREE, while run_scout costs $0.10 USDC (automatically handled by MCP server via x402 protocol).',
};

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

// Initialize MCP server instance
const mcpServer = createMCPServer();

export async function mcpHandler(c: Context): Promise<Response> {
  try {
    // Parse request body
    const body = await c.req.json();
    const validationResult = MCPRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiErrors.badRequest(
        c,
        `Invalid MCP request: ${validationResult.error.issues.map((e) => e.message).join(', ')}`,
      );
    }

    const { method, params } = validationResult.data;

    console.log('[MCP] Received request:', { method, params });

    // Handle different MCP methods
    switch (method) {
      case 'tools/list': {
        const result = await mcpServer.listTools();
        console.log('[MCP] Listing tools:', result.tools.length);
        return sendSuccess(c, result, STANDARD_STATUS_CODES.SUCCESS);
      }

      case 'tools/call': {
        if (!params?.name) {
          return ApiErrors.badRequest(c, 'Tool name is required for tools/call');
        }

        const toolRequest: MCPToolRequest = {
          name: params.name,
          arguments: params.arguments || {},
        };

        const result: MCPToolResponse = await mcpServer.callTool(toolRequest);

        if (result.isError) {
          console.error('[MCP] Tool call failed:', result.content[0]?.text);
          return ApiErrors.internal(c, result.content[0]?.text || 'Tool execution failed');
        }

        console.log('[MCP] Tool call succeeded:', params.name);
        return sendSuccess(c, result, STANDARD_STATUS_CODES.SUCCESS);
      }

      default:
        return ApiErrors.badRequest(c, `Unknown MCP method: ${method}`);
    }
  } catch (error) {
    console.error('[MCP] Handler error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return ApiErrors.internal(c, `MCP protocol error: ${errorMessage}`);
  }
}
