// ═══════════════════════════════════════════════════════════════
// APP CONFIGURATION - CENTRALIZED CONFIG FOR ENTIRE APPLICATION
// ═══════════════════════════════════════════════════════════════

// Get app ID for building default URLs
const appId = import.meta.env.VITE_TAROBASE_APP_ID;

// ═════════════════════════════════════════════════════════════
// PARTYSERVER CONFIGURATION
// ═════════════════════════════════════════════════════════════

/**
 * PartyServer backend URL configuration
 *
 * Priority:
 * 1. VITE_PARTYSERVER_URL (if explicitly set)
 * 2. <appId>.wish.poof.new (default for deployed apps)
 * 3. localhost:1999 (fallback for local development)
 */
export const PARTYSERVER_URL =
  import.meta.env.VITE_PARTYSERVER_URL || (appId ? `${appId}-api.poof.new` : 'localhost:1999');

// ═════════════════════════════════════════════════════════════
// TAROBASE CONFIGURATION
// ═════════════════════════════════════════════════════════════

export const TAROBASE_CONFIG = {
  appId,
  chain: import.meta.env.VITE_CHAIN || 'solana_devnet',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://idelle-8nxsep-fast-devnet.helius-rpc.com',
  authMethod: import.meta.env.VITE_AUTH_METHOD || 'privy',
  wsApiUrl: import.meta.env.VITE_WS_API_URL || 'wss://ws-staging.tarobase.com',
  apiUrl: import.meta.env.VITE_API_URL || 'https://api-staging.tarobase.com',
  authApiUrl: import.meta.env.VITE_AUTH_API_URL || 'https://auth-staging.tarobase.com',
} as const;

// ═════════════════════════════════════════════════════════════
// UI CONFIGURATION
// ═════════════════════════════════════════════════════════════

export const UI_CONFIG = {
  // UI configuration settings can be added here
} as const;

// ═════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════

/**
 * Get the full PartyServer WebSocket URL for a specific room
 * @param roomId - The room identifier
 * @param party - The party name (defaults to "state")
 * @param protocol - WebSocket protocol (defaults to "wss" for production, "ws" for localhost)
 * @param token - Optional JWT token to embed in URL query parameters
 */
export function getPartyServerWsUrl(
  roomId: string | number,
  party: string = 'state',
  protocol?: 'ws' | 'wss',
  token?: string,
): string {
  // Auto-detect protocol if not specified
  if (!protocol) {
    protocol = PARTYSERVER_URL.includes('localhost') ? 'ws' : 'wss';
  }

  const baseUrl = `${protocol}://${PARTYSERVER_URL}/parties/${party}/${roomId}`;

  // Add JWT token as query parameter if provided
  if (token) {
    const urlParams = new URLSearchParams({ token });
    return `${baseUrl}?${urlParams.toString()}`;
  }

  return baseUrl;
}

/**
 * Get the PartyServer HTTP URL for API calls
 * @param path - API path (optional)
 */
export function getPartyServerHttpUrl(path?: string): string {
  const protocol = PARTYSERVER_URL.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${PARTYSERVER_URL}`;
  return path ? `${baseUrl}${path}` : baseUrl;
}

// ═════════════════════════════════════════════════════════════
// DEVELOPMENT HELPERS
// ═════════════════════════════════════════════════════════════

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 App Configuration:', {
    partyServerUrl: PARTYSERVER_URL,
    tarobaseAppId: appId,
    environment: import.meta.env.NODE_ENV,
    wsExample: getPartyServerWsUrl('demo-room'),
  });
}
