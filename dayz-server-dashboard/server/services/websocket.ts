// WebSocket service for real-time updates

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../middleware/auth';
import { WSMessage, AuthPayload } from '../types';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  subscribedServers: Set<number>;
  isAlive: boolean;
}

let wss: WebSocketServer | null = null;
const clients = new Set<AuthenticatedWebSocket>();

/**
 * Initialize the WebSocket server attached to an HTTP server.
 */
export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const authWs = ws as AuthenticatedWebSocket;
    authWs.subscribedServers = new Set();
    authWs.isAlive = true;

    // Try to authenticate from query param
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (token) {
        const payload = verifyToken(token);
        authWs.userId = payload.userId;
      }
    } catch {
      // Allow unauthenticated connections but they won't receive server-specific data
    }

    clients.add(authWs);

    authWs.on('pong', () => {
      authWs.isAlive = true;
    });

    authWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'authenticate': {
            try {
              const payload = verifyToken(msg.token);
              authWs.userId = payload.userId;
              authWs.send(JSON.stringify({ type: 'authenticated', userId: payload.userId }));
            } catch {
              authWs.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
            }
            break;
          }

          case 'subscribe': {
            if (msg.serverId) {
              authWs.subscribedServers.add(Number(msg.serverId));
              authWs.send(JSON.stringify({ type: 'subscribed', serverId: msg.serverId }));
            }
            break;
          }

          case 'unsubscribe': {
            if (msg.serverId) {
              authWs.subscribedServers.delete(Number(msg.serverId));
              authWs.send(JSON.stringify({ type: 'unsubscribed', serverId: msg.serverId }));
            }
            break;
          }

          default:
            break;
        }
      } catch {
        // Ignore malformed messages
      }
    });

    authWs.on('close', () => {
      clients.delete(authWs);
    });

    authWs.on('error', () => {
      clients.delete(authWs);
    });

    // Send welcome message
    authWs.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  });

  // Heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.terminate();
        clients.delete(client);
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  console.log('WebSocket server initialized');
  return wss;
}

/**
 * Broadcast a message to all clients subscribed to a specific server.
 */
export function broadcastToServer(serverId: number, message: WSMessage): void {
  const payload = JSON.stringify(message);

  for (const client of clients) {
    if (
      client.readyState === WebSocket.OPEN &&
      client.subscribedServers.has(serverId)
    ) {
      client.send(payload);
    }
  }
}

/**
 * Broadcast a message to all connected clients.
 */
export function broadcastToAll(message: WSMessage): void {
  const payload = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Send a message to a specific user.
 */
export function sendToUser(userId: number, message: WSMessage): void {
  const payload = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(payload);
    }
  }
}

/**
 * Get connected client count.
 */
export function getClientCount(): number {
  return clients.size;
}
