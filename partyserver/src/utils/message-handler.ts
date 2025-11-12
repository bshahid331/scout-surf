import { Connection } from 'partyserver';
// Optional: Import Tarobase SDK functions if using persistent storage
// import { setItem, getItem } from '../tarobase';

export interface MessageHandlerOptions {
  enableLogging?: boolean;
}

export function createMessageHandler(server: any, options: MessageHandlerOptions = {}) {
  const { enableLogging = true } = options;

  const log = (message: string, data?: any) => {
    if (enableLogging) {
      console.log(`[MessageHandler] ${message}`, data);
    }
  };

  return {
    // Handle incoming messages with routing
    async handle(connection: Connection, data: any): Promise<void> {
      log(`Handling message type: ${data.type}`, { connectionId: connection.id });

      switch (data.type) {
        case 'ping':
          await this.handlePing(connection, data);
          break;
        case 'chat':
          await this.handleChat(connection, data);
          break;
        case 'gameAction':
          await this.handleGameAction(connection, data);
          break;
        case 'dataUpdate':
          await this.handleDataUpdate(connection, data);
          break;
        default:
          await this.handleUnknown(connection, data);
      }
    },

    // Example: Handle ping/pong for connection health
    async handlePing(connection: Connection, data: any): Promise<void> {
      connection.send(
        JSON.stringify({
          type: 'pong',
          timestamp: Date.now(),
          originalTimestamp: data.timestamp,
        }),
      );
    },

    // Example: Handle chat messages with optional persistence
    async handleChat(connection: Connection, data: any): Promise<void> {
      const message = {
        id: crypto.randomUUID(),
        content: data.content,
        from: connection.id,
        timestamp: Date.now(),
        roomId: server.name,
      };

      // EXAMPLE: Persist to Tarobase (uncomment if needed)
      /*
      try {
        await setItem('chatMessages', message.id, message);
      } catch (error) {
        log('Failed to persist chat message', error);
      }
      */

      // Broadcast to all connections
      server.broadcast(
        JSON.stringify({
          type: 'chatMessage',
          message,
        }),
      );
    },

    // Example: Handle game-specific actions
    async handleGameAction(connection: Connection, data: any): Promise<void> {
      // Validate the action based on your game rules
      const isValidAction = this.validateGameAction(connection, data);
      if (!isValidAction) {
        connection.send(
          JSON.stringify({
            type: 'error',
            code: 'INVALID_ACTION',
            message: 'Invalid game action',
          }),
        );
        return;
      }

      // Update game state and broadcast
      const gameUpdate = {
        type: 'gameUpdate',
        action: data.action,
        player: connection.id,
        timestamp: Date.now(),
      };

      server.broadcast(JSON.stringify(gameUpdate));
    },

    // Example: Handle data updates for dashboards/real-time apps
    async handleDataUpdate(connection: Connection, data: any): Promise<void> {
      // EXAMPLE: Store in Tarobase for persistence
      /*
      try {
        await setItem('liveData', data.key, {
          value: data.value,
          updatedBy: connection.id,
          timestamp: Date.now()
        });
      } catch (error) {
        log('Failed to persist data update', error);
      }
      */

      // Broadcast to subscribers
      server.broadcast(
        JSON.stringify({
          type: 'dataChanged',
          key: data.key,
          value: data.value,
          timestamp: Date.now(),
        }),
      );
    },

    // Example: Handle unknown message types
    async handleUnknown(connection: Connection, data: any): Promise<void> {
      log(`Unknown message type: ${data.type}`, data);
      connection.send(
        JSON.stringify({
          type: 'error',
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unsupported message type: ${data.type}`,
          timestamp: Date.now(),
        }),
      );
    },

    // Helper: Validate game actions (customize based on your game)
    validateGameAction(connection: Connection, data: any): boolean {
      // Example validation logic
      if (!data.action) return false;
      if (!['move', 'attack', 'use', 'ready'].includes(data.action)) return false;

      // Add your specific game validation here
      return true;
    },

    // Helper: Get connection info
    getConnectionInfo(connection: Connection): any {
      // Access the server's connection map to get user info
      // This depends on how you store connection data in your server
      return {
        id: connection.id,
        // Add other connection metadata as needed
      };
    },
  };
}
