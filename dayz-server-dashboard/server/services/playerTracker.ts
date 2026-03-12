// Player tracking service: polls positions, tracks sessions, calculates metrics

import { queryAll, queryOne, run, transaction } from '../db';
import { activeConnections } from '../rcon/client';
import { PlayerRow, PlayerSessionRow, OnlinePlayer } from '../types';
import { broadcastToServer } from './websocket';

let trackingInterval: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL_MS = 15000; // 15 seconds

/**
 * Start the player tracking service.
 */
export function startPlayerTracker(): void {
  console.log('Starting player tracker...');

  trackingInterval = setInterval(() => {
    pollAllServers();
  }, POLL_INTERVAL_MS);

  // Also set up event listeners on all active connections
  for (const [serverId, client] of activeConnections) {
    attachEventListeners(serverId);
  }
}

/**
 * Stop the player tracking service.
 */
export function stopPlayerTracker(): void {
  console.log('Stopping player tracker...');
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

/**
 * Attach event listeners to an RCON client for a server.
 */
export function attachEventListeners(serverId: number): void {
  const client = activeConnections.get(serverId);
  if (!client) return;

  client.on('player_join', (data: { name: string; steamId: string }) => {
    handlePlayerJoin(serverId, data.name, data.steamId);
  });

  client.on('player_leave', (data: { name: string; steamId: string; reason: string }) => {
    handlePlayerLeave(serverId, data.name, data.steamId, data.reason);
  });

  client.on('chat', (data: { senderName: string; message: string; isAdmin: boolean; steamId?: string }) => {
    handleChatMessage(serverId, data);
  });

  client.on('player_positions', (players: OnlinePlayer[]) => {
    handlePlayerPositions(serverId, players);
  });
}

/**
 * Poll all connected servers for player data.
 */
async function pollAllServers(): Promise<void> {
  for (const [serverId, client] of activeConnections) {
    if (!client.isConnected()) continue;

    try {
      const players = await client.getPlayerList();

      // Store positions
      handlePlayerPositions(serverId, players);

      // Broadcast positions via WebSocket
      broadcastToServer(serverId, {
        type: 'player_move',
        serverId,
        data: players.map(p => ({
          steamId: p.steamId,
          name: p.name,
          x: p.x,
          y: p.y,
          z: p.z,
          ping: p.ping,
        })),
        timestamp: new Date().toISOString(),
      });

      // Broadcast server status
      const status = client.getServerStatus();
      broadcastToServer(serverId, {
        type: 'server_status',
        serverId,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`Error polling server ${serverId}:`, error.message);
    }
  }
}

/**
 * Handle a player joining a server.
 */
function handlePlayerJoin(serverId: number, name: string, steamId: string): void {
  try {
    // Upsert player record
    let player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE server_id = ? AND steam_id = ?',
      [serverId, steamId]
    );

    if (!player) {
      run(
        `INSERT INTO players (server_id, steam_id, name, first_seen, last_seen)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
        [serverId, steamId, name]
      );
      player = queryOne<PlayerRow>(
        'SELECT * FROM players WHERE server_id = ? AND steam_id = ?',
        [serverId, steamId]
      );
    } else {
      run(
        `UPDATE players SET name = ?, last_seen = datetime('now') WHERE id = ?`,
        [name, player.id]
      );
    }

    if (player) {
      // Create a new session
      run(
        `INSERT INTO player_sessions (player_id, server_id, joined_at)
         VALUES (?, ?, datetime('now'))`,
        [player.id, serverId]
      );
    }

    // Broadcast join event
    broadcastToServer(serverId, {
      type: 'player_join',
      serverId,
      data: { name, steamId },
      timestamp: new Date().toISOString(),
    });

    console.log(`Player joined server ${serverId}: ${name} (${steamId})`);
  } catch (error: any) {
    console.error(`Error handling player join:`, error.message);
  }
}

/**
 * Handle a player leaving a server.
 */
function handlePlayerLeave(serverId: number, name: string, steamId: string, reason: string): void {
  try {
    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE server_id = ? AND steam_id = ?',
      [serverId, steamId]
    );

    if (player) {
      // Close the open session
      const openSession = queryOne<PlayerSessionRow>(
        'SELECT * FROM player_sessions WHERE player_id = ? AND server_id = ? AND left_at IS NULL ORDER BY joined_at DESC',
        [player.id, serverId]
      );

      if (openSession) {
        run(
          `UPDATE player_sessions
           SET left_at = datetime('now'),
               duration_seconds = CAST((julianday('now') - julianday(joined_at)) * 86400 AS INTEGER)
           WHERE id = ?`,
          [openSession.id]
        );

        // Update total playtime
        const session = queryOne<PlayerSessionRow>(
          'SELECT * FROM player_sessions WHERE id = ?',
          [openSession.id]
        );
        if (session && session.duration_seconds) {
          run(
            `UPDATE players SET total_playtime_seconds = total_playtime_seconds + ?, last_seen = datetime('now') WHERE id = ?`,
            [session.duration_seconds, player.id]
          );
        }
      }
    }

    // Broadcast leave event
    broadcastToServer(serverId, {
      type: 'player_leave',
      serverId,
      data: { name, steamId, reason },
      timestamp: new Date().toISOString(),
    });

    console.log(`Player left server ${serverId}: ${name} (${steamId}) - ${reason}`);
  } catch (error: any) {
    console.error(`Error handling player leave:`, error.message);
  }
}

/**
 * Handle a chat message.
 */
function handleChatMessage(
  serverId: number,
  data: { senderName: string; message: string; isAdmin: boolean; steamId?: string }
): void {
  try {
    let playerId: number | null = null;

    if (data.steamId) {
      const player = queryOne<PlayerRow>(
        'SELECT id FROM players WHERE server_id = ? AND steam_id = ?',
        [serverId, data.steamId]
      );
      if (player) {
        playerId = player.id;
      }
    }

    run(
      `INSERT INTO chat_messages (server_id, player_id, sender_name, message, is_admin)
       VALUES (?, ?, ?, ?, ?)`,
      [serverId, playerId, data.senderName, data.message, data.isAdmin ? 1 : 0]
    );

    // Broadcast chat message
    broadcastToServer(serverId, {
      type: 'chat_message',
      serverId,
      data: {
        senderName: data.senderName,
        message: data.message,
        isAdmin: data.isAdmin,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`Error handling chat message:`, error.message);
  }
}

/**
 * Handle player position updates.
 */
function handlePlayerPositions(serverId: number, players: OnlinePlayer[]): void {
  try {
    transaction(() => {
      for (const p of players) {
        const player = queryOne<PlayerRow>(
          'SELECT id FROM players WHERE server_id = ? AND steam_id = ?',
          [serverId, p.steamId]
        );

        if (player) {
          run(
            `INSERT INTO player_positions (player_id, server_id, x, y, z)
             VALUES (?, ?, ?, ?, ?)`,
            [player.id, serverId, p.x, p.y, p.z]
          );
        }
      }
    });
  } catch (error: any) {
    console.error(`Error storing player positions:`, error.message);
  }
}

/**
 * Update daily player metrics for a server.
 */
export function updateDailyMetrics(serverId: number): void {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Calculate metrics from sessions today
    const sessions = queryAll<PlayerSessionRow>(
      `SELECT * FROM player_sessions
       WHERE server_id = ? AND DATE(joined_at) = ?`,
      [serverId, today]
    );

    const uniquePlayers = new Set(sessions.map(s => s.player_id));
    const completedSessions = sessions.filter(s => s.duration_seconds != null);
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const avgDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;

    // Get current online count for peak tracking
    const client = activeConnections.get(serverId);
    const currentCount = client?.isConnected()
      ? client.getServerStatus().playerCount
      : 0;

    // Upsert metrics
    const existing = queryOne<{ id: number; peak_players: number }>(
      'SELECT id, peak_players FROM player_metrics WHERE server_id = ? AND date = ?',
      [serverId, today]
    );

    if (existing) {
      const peakPlayers = Math.max(existing.peak_players, currentCount);
      run(
        `UPDATE player_metrics
         SET peak_players = ?, avg_players = ?, total_unique_players = ?,
             total_sessions = ?, avg_session_duration = ?
         WHERE id = ?`,
        [peakPlayers, currentCount, uniquePlayers.size, sessions.length, avgDuration, existing.id]
      );
    } else {
      run(
        `INSERT INTO player_metrics (server_id, date, peak_players, avg_players, total_unique_players, total_sessions, avg_session_duration)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [serverId, today, currentCount, currentCount, uniquePlayers.size, sessions.length, avgDuration]
      );
    }
  } catch (error: any) {
    console.error(`Error updating daily metrics for server ${serverId}:`, error.message);
  }
}
