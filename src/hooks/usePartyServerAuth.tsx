import { getPartyServerWsUrl } from '@/lib/config';
import { getIdToken, useAuth } from '@pooflabs/web';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PartyServerMessage {
  type: string;
  [key: string]: any;
}

interface UsePartyServerAuthReturn {
  ws: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  onMessage: (handler: (message: PartyServerMessage) => void) => void;
}

export function usePartyServerAuth(lobbyId: string): UsePartyServerAuthReturn {
  const { user } = useAuth();

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageHandlers = useRef<Set<(message: PartyServerMessage) => void>>(new Set());
  const previousAuthState = useRef<string | null | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!lobbyId) {
      return;
    }

    // Get current user from auth context
    const currentUser = user;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWs(null);
      setIsConnected(false);
    }

    // Get fresh ID token
    let idToken: string | undefined;
    if (currentUser) {
      try {
        const token = getIdToken();
        idToken = token ? token : undefined;
        console.log('🔌 CONNECT: ID token retrieved:', idToken ? 'present' : 'missing');
      } catch (error) {
        console.error('🔌 CONNECT: Failed to get ID token:', error);
        idToken = undefined;
      }
    }

    // Create WebSocket URL with token
    const websocketUrl = getPartyServerWsUrl(lobbyId, 'state', undefined, idToken);

    try {
      const websocket = new WebSocket(websocketUrl);

      websocket.onopen = () => {
        setIsConnected(true);
      };

      websocket.onmessage = (event) => {
        try {
          const message: PartyServerMessage = JSON.parse(event.data);
          messageHandlers.current.forEach((handler) => handler(message));
        } catch (error) {
          console.error('🔌 CONNECT: Failed to parse PartyServer message:', error);
        }
      };

      websocket.onclose = () => {
        setIsConnected(false);
        if (wsRef.current === websocket) {
          setWs(null);
          wsRef.current = null;
        }
      };

      websocket.onerror = (error) => {
        console.error('🔌 CONNECT: PartyServer error:', error);
        console.error('🔌 CONNECT: WebSocket state:', websocket.readyState);
      };

      wsRef.current = websocket;
      setWs(websocket);
    } catch (error) {
      console.error('🔌 CONNECT: Failed to create WebSocket:', error);
    }
  }, [lobbyId, user]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  // Connect when user auth changes or on initial mount
  useEffect(() => {
    const currentAuthState = user?.address || null;

    // Connect on initial mount OR when auth state changes
    if (previousAuthState.current === undefined || previousAuthState.current !== currentAuthState) {
      previousAuthState.current = currentAuthState;
      connect();
    } else {
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Reset auth state tracking so React dev mode double-effects will reconnect
      previousAuthState.current = undefined;
    };
  }, [user?.address, lobbyId]);

  const sendMessage = useCallback(
    (message: any) => {
      if (ws && isConnected) {
        ws.send(JSON.stringify(message));
      } else {
        console.warn('Cannot send message: not connected');
      }
    },
    [ws, isConnected],
  );

  const onMessage = useCallback((handler: (message: PartyServerMessage) => void) => {
    messageHandlers.current.add(handler);

    return () => {
      messageHandlers.current.delete(handler);
    };
  }, []);

  return {
    ws,
    isConnected,
    sendMessage,
    reconnect,
    onMessage,
  };
}
