// Player management routes

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate, requireFeature } from '../middleware/auth';
import { getConnection } from '../rcon/client';
import { ServerRow, PlayerRow, PlayerSessionRow, PlayerPositionRow, OnlinePlayer } from '../types';

export const router = express.Router();

router.use(authenticate);

// Helper: verify server ownership
function verifyServer(serverId: number, userId: number): ServerRow | null {
  return queryOne<ServerRow>(
    'SELECT * FROM servers WHERE id = ? AND user_id = ?',
    [serverId, userId]
  ) || null;
}

// GET /api/servers/:id/players - list online players
router.get('/:id/players', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client || !client.isConnected()) {
      return res.json({ players: [], count: 0, connected: false });
    }

    const players = await client.getPlayerList();
    res.json({ players, count: players.length, connected: true });
  } catch (error: any) {
    console.error('List online players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:id/players/all - list all known players (search/filter/pagination)
router.get('/:id/players/all', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const search = (req.query.search as string) || '';
    const filter = (req.query.filter as string) || 'all'; // all, banned, active
    const sortBy = (req.query.sort as string) || 'last_seen';
    const sortDir = (req.query.dir as string) === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE server_id = ?';
    const params: unknown[] = [serverId];

    if (search) {
      whereClause += ' AND (name LIKE ? OR steam_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (filter === 'banned') {
      whereClause += ' AND is_banned = 1';
    } else if (filter === 'active') {
      whereClause += ' AND is_banned = 0';
    }

    const validSortColumns = ['name', 'last_seen', 'first_seen', 'total_playtime_seconds'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'last_seen';

    const total = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM players ${whereClause}`,
      params
    )?.count || 0;

    const players = queryAll<PlayerRow>(
      `SELECT * FROM players ${whereClause} ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: players,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('List all players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:id/players/:playerId - get player details
router.get('/:id/players/:playerId', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get recent sessions
    const sessions = queryAll<PlayerSessionRow>(
      'SELECT * FROM player_sessions WHERE player_id = ? ORDER BY joined_at DESC LIMIT 10',
      [playerId]
    );

    // Get last known position
    const lastPosition = queryOne<PlayerPositionRow>(
      'SELECT * FROM player_positions WHERE player_id = ? ORDER BY timestamp DESC LIMIT 1',
      [playerId]
    );

    // Check if currently online
    const client = getConnection(serverId);
    let isOnline = false;
    if (client?.isConnected()) {
      const onlinePlayers = await_sync_getPlayers(client);
      isOnline = onlinePlayers.some(p => p.steamId === player.steam_id);
    }

    res.json({
      ...player,
      sessions,
      lastPosition,
      isOnline,
    });
  } catch (error: any) {
    console.error('Get player details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync helper to get players (for use in non-async contexts)
function await_sync_getPlayers(client: any): OnlinePlayer[] {
  try {
    // Since this is simulated, we can call getPlayerList synchronously via the internal state
    return client.simulatedPlayers || [];
  } catch {
    return [];
  }
}

// POST /api/servers/:id/players/:playerId/kick - kick player
router.post('/:id/players/:playerId/kick', requireFeature('admin_commands'), async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);
    const reason = req.body.reason || 'Kicked by admin';

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    // Find the player's RCON ID from the online list
    const onlinePlayers = await client.getPlayerList();
    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
    if (!onlinePlayer) {
      return res.status(400).json({ error: 'Player is not online' });
    }

    const result = await client.kickPlayer(onlinePlayer.id, reason);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'player_kicked', JSON.stringify({ playerId, name: player.name, reason })]
    );

    res.json({ message: result });
  } catch (error: any) {
    console.error('Kick player error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/players/:playerId/ban - ban player
router.post('/:id/players/:playerId/ban', requireFeature('admin_commands'), async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);
    const { reason, duration } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Update ban status in DB
    run(
      'UPDATE players SET is_banned = 1, ban_reason = ? WHERE id = ?',
      [reason, playerId]
    );

    // Kick from server if online
    const client = getConnection(serverId);
    let rconResult = 'Player banned in database';
    if (client?.isConnected()) {
      const onlinePlayers = await client.getPlayerList();
      const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
      if (onlinePlayer) {
        rconResult = await client.banPlayer(onlinePlayer.id, reason, duration || 0);
      }
    }

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'player_banned', JSON.stringify({ playerId, name: player.name, reason, duration })]
    );

    res.json({ message: rconResult });
  } catch (error: any) {
    console.error('Ban player error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/players/:playerId/teleport - teleport player
router.post('/:id/players/:playerId/teleport', requireFeature('admin_commands'), async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);
    const { x, y, z } = req.body;

    if (x == null || y == null || z == null) {
      return res.status(400).json({ error: 'Coordinates x, y, z are required' });
    }

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const onlinePlayers = await client.getPlayerList();
    const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
    if (!onlinePlayer) {
      return res.status(400).json({ error: 'Player is not online' });
    }

    const result = await client.teleportPlayer(onlinePlayer.id, x, y, z);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'player_teleported', JSON.stringify({ playerId, name: player.name, x, y, z })]
    );

    res.json({ message: result });
  } catch (error: any) {
    console.error('Teleport player error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/players/:playerId/heal - heal player
router.post('/:id/players/:playerId/heal', requireFeature('admin_commands'), async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const onlinePlayers = await client.getPlayerList();
    const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
    if (!onlinePlayer) return res.status(400).json({ error: 'Player is not online' });

    const result = await client.healPlayer(onlinePlayer.id);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'player_healed', JSON.stringify({ playerId, name: player.name })]
    );

    res.json({ message: result });
  } catch (error: any) {
    console.error('Heal player error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/players/:playerId/godmode - toggle godmode
router.post('/:id/players/:playerId/godmode', requireFeature('admin_commands'), async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const onlinePlayers = await client.getPlayerList();
    const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
    if (!onlinePlayer) return res.status(400).json({ error: 'Player is not online' });

    const result = await client.godmodePlayer(onlinePlayer.id);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'player_godmode', JSON.stringify({ playerId, name: player.name })]
    );

    res.json({ message: result });
  } catch (error: any) {
    console.error('Godmode player error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/servers/:id/players/:playerId/inventory - get player inventory
router.get('/:id/players/:playerId/inventory', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const onlinePlayers = await client.getPlayerList();
    const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
    if (!onlinePlayer) return res.status(400).json({ error: 'Player is not online' });

    const inventory = await client.getPlayerInventory(onlinePlayer.id);
    res.json({ player: player.name, inventory });
  } catch (error: any) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/players/:playerId/message - send private message
router.post('/:id/players/:playerId/message', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const onlinePlayers = await client.getPlayerList();
    const onlinePlayer = onlinePlayers.find(p => p.steamId === player.steam_id);
    if (!onlinePlayer) return res.status(400).json({ error: 'Player is not online' });

    const result = await client.sendPrivateMessage(onlinePlayer.id, message);
    res.json({ message: result });
  } catch (error: any) {
    console.error('Send private message error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/servers/:id/players/:playerId/sessions - get player session history
router.get('/:id/players/:playerId/sessions', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const total = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM player_sessions WHERE player_id = ?',
      [playerId]
    )?.count || 0;

    const sessions = queryAll<PlayerSessionRow>(
      'SELECT * FROM player_sessions WHERE player_id = ? ORDER BY joined_at DESC LIMIT ? OFFSET ?',
      [playerId, limit, offset]
    );

    res.json({
      data: sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Get player sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:id/players/:playerId/positions - get player position history
router.get('/:id/players/:playerId/positions', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const playerId = parseInt(req.params.playerId);

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const player = queryOne<PlayerRow>(
      'SELECT * FROM players WHERE id = ? AND server_id = ?',
      [playerId, serverId]
    );
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 100));
    const since = req.query.since as string; // ISO datetime

    let sql = 'SELECT * FROM player_positions WHERE player_id = ?';
    const params: unknown[] = [playerId];

    if (since) {
      sql += ' AND timestamp >= ?';
      params.push(since);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const positions = queryAll<PlayerPositionRow>(sql, params);
    res.json(positions);
  } catch (error: any) {
    console.error('Get player positions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
