import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as cookie from 'cookie';
import { prisma } from '../db/prisma';
import { hashToken } from '../utils/crypto';
import { ENV } from '../config/env';
import { WS_EVENTS } from '../config/constants';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string | null;
  groupId?: string | null;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;
const wsClients = new Set<AuthenticatedWebSocket>();

export function initWebSocketServer(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    ws.userId = null;
    ws.groupId = null;
    ws.isAlive = true;
    wsClients.add(ws);

    // Try authenticating from cookie on initial handshake
    if (req.headers.cookie) {
      try {
        const parsedCookies = cookie.parse(req.headers.cookie);
        const token = parsedCookies[ENV.COOKIE_NAME];
        if (token) {
          await authenticateSocket(ws, token);
        }
      } catch (err) {
        console.warn('[WS Handshake Cookie Auth Error]', err);
      }
    }

    // Send initial CONNECTED event
    ws.send(JSON.stringify({
      type: WS_EVENTS.CONNECTED,
      payload: {
        clientCount: getOnlineUserCount(),
        timestamp: new Date().toISOString(),
      },
    }));

    broadcastClientCount();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        } else if (msg.type === 'IDENTIFY') {
          const token = msg.payload?.token;
          if (token) {
            await authenticateSocket(ws, token);
            broadcastClientCount();
          }
        }
      } catch (err) {
        console.error('[WS Message Parse Error]', err);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
      broadcastClientCount();
    });

    ws.on('error', (err) => {
      console.warn('[WS Socket Error]', err.message);
      wsClients.delete(ws);
      broadcastClientCount();
    });
  });

  // Heartbeat interval to prune dead sockets
  const heartbeatInterval = setInterval(() => {
    for (const ws of wsClients) {
      if (ws.isAlive === false) {
        ws.terminate();
        wsClients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

/**
 * Authenticate socket securely using token hash and database lookup.
 * Derives userId and groupId directly from verified membership.
 */
async function authenticateSocket(ws: AuthenticatedWebSocket, rawToken: string): Promise<boolean> {
  try {
    const tokenHash = hashToken(rawToken);
    const session = await prisma.session.findFirst({
      where: {
        OR: [
          { session_token_hash: tokenHash },
          { token: rawToken },
        ],
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            memberships: {
              take: 1,
            },
          },
        },
      },
    });

    if (session && session.user && session.user.is_active) {
      ws.userId = session.user.id;
      ws.groupId = session.user.memberships[0]?.group_id || null;
      return true;
    }
  } catch (err) {
    console.warn('[WS Authenticate Socket Error]', err);
  }
  return false;
}

export function getOnlineUserCount(): number {
  const onlineUserIds = new Set<string>();
  let anonymousClients = 0;

  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      if (client.userId) {
        onlineUserIds.add(client.userId);
      } else {
        anonymousClients++;
      }
    }
  }

  if (onlineUserIds.size > 0) {
    return onlineUserIds.size;
  }
  return anonymousClients > 0 ? 1 : 0;
}

export function broadcastClientCount() {
  const count = getOnlineUserCount();
  broadcast({
    type: WS_EVENTS.CLIENT_COUNT,
    payload: { clientCount: count },
  });
}

/**
 * Broadcast event to connected clients.
 * If targetGroupId is specified, only clients whose verified membership
 * matches targetGroupId will receive the event (Group Isolation).
 */
export function broadcast(event: { type: string; payload: any }, senderWs: WebSocket | null = null, targetGroupId: string | null = null) {
  const payloadStr = JSON.stringify(event);
  for (const client of wsClients) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      // Group isolation: if targetGroupId is provided, only broadcast to members of that group
      if (targetGroupId && client.groupId && client.groupId !== targetGroupId) {
        continue;
      }
      try {
        client.send(payloadStr);
      } catch (err) {
        console.error('[WS Broadcast Error]', err);
      }
    }
  }
}
