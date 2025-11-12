/**
 * MCP (Model Context Protocol) Server for Scout Operations
 *
 * Exposes scout operations as MCP tools for AI agents to use.
 * - create_scout: Create and start a new scout with x402 payment ($0.30 USDC)
 * - get_scout_status: Check scout status and results (FREE)
 *
 * The MCP server acts as a CLIENT making calls to internal API endpoints.
 * Payment handling for x402-protected endpoints uses PROJECT_VAULT_ADDRESS.
 *
 * NOTE: This implementation requires @faremeter/payment-solana to be installed.
 * Install with: cd partyserver && bun add @faremeter/payment-solana@0.11.0
 */

import type { CreateScoutRequest, CreateScoutResponse } from './routes/scouts-create.js';
import type { ScoutStatusResponse } from './routes/scouts-status.js';
import { PROJECT_VAULT_ADDRESS } from './constants.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MCPToolRequest {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT CLIENT SETUP
// ═══════════════════════════════════════════════════════════════

let fetchWithPayment: typeof fetch | null = null;

async function initializePaymentClient(): Promise<typeof fetch> {
  if (fetchWithPayment) {
    return fetchWithPayment;
  }

  try {
    // Dynamic imports to avoid errors if package not installed
    const { createPaymentHandler } = await import('@faremeter/payment-solana/exact');
    const { wrap } = await import('@faremeter/fetch');
    const { lookupKnownSPLToken } = await import('@faremeter/info/solana');
    const { getConfig } = await import('@pooflabs/server');
    const { PublicKey, Connection, Keypair } = await import('@solana/web3.js');

    // Detect environment
    const env = process.env.ENV || 'PREVIEW';
    const network = env === 'LIVE' ? 'mainnet-beta' : 'devnet';

    // Get RPC URL from Poof config
    const config = await getConfig();
    const connection = new Connection(config.rpcUrl);

    // Get USDC mint address
    const usdcInfo = lookupKnownSPLToken(network, 'USDC');
    const usdcMint = new PublicKey(usdcInfo.address);

    // Get project vault private key from environment
    const privateKeyStr = process.env.PROJECT_VAULT_PRIVATE_KEY;
    if (!privateKeyStr) {
      throw new Error('PROJECT_VAULT_PRIVATE_KEY not configured');
    }
    const privateKeyBytes = JSON.parse(privateKeyStr);
    const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyBytes));

    // Create wallet interface using project vault keypair
    const wallet = {
      network,
      publicKey: keypair.publicKey,
      updateTransaction: async (tx: any) => {
        tx.sign(keypair);
        return tx;
      },
    };

    // Create payment handler and wrap fetch
    const paymentHandler = createPaymentHandler(wallet, usdcMint, connection);
    fetchWithPayment = wrap(fetch, { handlers: [paymentHandler] });

    console.log('[MCP] Payment client initialized:', {
      network,
      wallet: keypair.publicKey.toBase58(),
      usdc: usdcInfo.address,
    });

    return fetchWithPayment;
  } catch (error) {
    console.error('[MCP] Failed to initialize payment client:', error);
    console.error('[MCP] Make sure @faremeter/payment-solana@0.11.0 is installed');
    throw new Error(
      'Failed to initialize MCP payment client. Install @faremeter/payment-solana@0.11.0',
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TOOLS: MCPTool[] = [
  {
    name: 'create_scout',
    description:
      'Create and immediately start a new scout with instructions for web automation. This operation costs $0.30 USDC and is automatically paid using x402 payment protocol. The scout will start running immediately in browser-use. Use get_scout_status to check for completion.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the scout/task (1-100 characters)',
        },
        instructions: {
          type: 'string',
          description: 'What the scout should do on the web (e.g., "Browse to amazon.com and check iPhone 15 price")',
        },
        resultAction: {
          type: 'string',
          description: 'Optional: What to do with the results (e.g., "Send me an email if price drops below $800")',
        },
        authToken: {
          type: 'string',
          description: 'JWT authentication token from the user',
        },
      },
      required: ['name', 'instructions', 'authToken'],
    },
  },
  {
    name: 'get_scout_status',
    description:
      'Check the status of a running scout. Returns current status and results if completed. FREE - no payment required.',
    inputSchema: {
      type: 'object',
      properties: {
        scoutId: {
          type: 'string',
          description: 'ID of the scout to check (obtained from create_scout)',
        },
        authToken: {
          type: 'string',
          description: 'JWT authentication token from the user',
        },
      },
      required: ['scoutId', 'authToken'],
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════

async function createScout(args: {
  name: string;
  instructions: string;
  resultAction?: string;
  authToken: string;
}): Promise<CreateScoutResponse> {
  const { name, instructions, resultAction, authToken } = args;

  // Validate inputs
  if (!name || name.length < 1 || name.length > 100) {
    throw new Error('Scout name must be 1-100 characters');
  }
  if (!instructions || instructions.length < 1) {
    throw new Error('Instructions are required');
  }
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  // Initialize payment client for x402-protected endpoint
  const payingFetch = await initializePaymentClient();

  // Get base URL (use environment or default to localhost)
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:1999';

  // Make x402-protected API request
  // Payment will be automatically handled by @faremeter/fetch
  const response = await payingFetch(`${baseUrl}/api/scouts/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      name,
      instructions,
      resultAction,
    } as CreateScoutRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create scout: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as CreateScoutResponse;
}

async function getScoutStatus(args: { scoutId: string; authToken: string }): Promise<ScoutStatusResponse> {
  const { scoutId, authToken } = args;

  // Validate inputs
  if (!scoutId) {
    throw new Error('Scout ID is required');
  }
  if (!authToken) {
    throw new Error('Authentication token is required');
  }

  // Get base URL (use environment or default to localhost)
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:1999';

  // Make API request (no payment needed for status check)
  const response = await fetch(`${baseUrl}/api/scouts/${scoutId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get scout status: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data as ScoutStatusResponse;
}

// ═══════════════════════════════════════════════════════════════
// MCP PROTOCOL HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleListTools(): Promise<{ tools: MCPTool[] }> {
  return { tools: TOOLS };
}

async function handleCallTool(request: MCPToolRequest): Promise<MCPToolResponse> {
  const { name, arguments: args } = request;

  try {
    console.log(`[MCP] Calling tool: ${name}`, JSON.stringify(args, null, 2));

    let result: any;

    switch (name) {
      case 'create_scout':
        result = await createScout(args as any);
        break;

      case 'get_scout_status':
        result = await getScoutStatus(args as any);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    console.log(`[MCP] Tool ${name} succeeded:`, JSON.stringify(result, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`[MCP] Tool ${name} failed:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: errorMessage,
              tool: name,
              arguments: args,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MCP SERVER INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface MCPServer {
  listTools: () => Promise<{ tools: MCPTool[] }>;
  callTool: (request: MCPToolRequest) => Promise<MCPToolResponse>;
}

export function createMCPServer(): MCPServer {
  console.log('[MCP] Server initialized with tools:', TOOLS.map((t) => t.name).join(', '));

  return {
    listTools: handleListTools,
    callTool: handleCallTool,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { TOOLS, createScout, getScoutStatus };
export type { MCPTool, MCPToolRequest, MCPToolResponse };
