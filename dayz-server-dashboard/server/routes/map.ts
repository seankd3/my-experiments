// Map/entities routes (requires 'map' feature)

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate, requireFeature } from '../middleware/auth';
import { getConnection } from '../rcon/client';
import { ServerRow, MapEntityRow, PlayerRow } from '../types';

export const router = express.Router();

router.use(authenticate);
router.use(requireFeature('map'));

// Helper: verify server ownership
function verifyServer(serverId: number, userId: number): ServerRow | null {
  return queryOne<ServerRow>(
    'SELECT * FROM servers WHERE id = ? AND user_id = ?',
    [serverId, userId]
  ) || null;
}

// GET /api/servers/:id/map/entities - get all map entities
router.get('/:id/map/entities', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const typeFilter = req.query.type as string;

    let sql = 'SELECT * FROM map_entities WHERE server_id = ?';
    const params: unknown[] = [serverId];

    if (typeFilter && ['vehicle', 'tent', 'flag', 'stash', 'building'].includes(typeFilter)) {
      sql += ' AND type = ?';
      params.push(typeFilter);
    }

    sql += ' ORDER BY last_updated DESC';

    const entities = queryAll<MapEntityRow>(sql, params);

    const parsed = entities.map(e => ({
      ...e,
      data: JSON.parse(e.data),
    }));

    res.json(parsed);
  } catch (error: any) {
    console.error('Get map entities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:id/map/players - get player positions
router.get('/:id/map/players', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.json({ players: [], connected: false });
    }

    const players = await client.getPlayerList();
    res.json({
      players: players.map(p => ({
        steamId: p.steamId,
        name: p.name,
        x: p.x,
        y: p.y,
        z: p.z,
        ping: p.ping,
      })),
      connected: true,
    });
  } catch (error: any) {
    console.error('Get map players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:id/map/spawn - spawn item at position
router.post('/:id/map/spawn', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { item, x, y, z } = req.body;

    if (!item || x == null || y == null || z == null) {
      return res.status(400).json({ error: 'item, x, y, z are required' });
    }

    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    const result = await client.spawnItem(item, x, y, z);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'item_spawned', JSON.stringify({ item, x, y, z })]
    );

    res.json({ message: result });
  } catch (error: any) {
    console.error('Spawn item error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/map/teleport - teleport player to position
router.post('/:id/map/teleport', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { playerId, x, y, z } = req.body;

    if (!playerId || x == null || y == null || z == null) {
      return res.status(400).json({ error: 'playerId, x, y, z are required' });
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
      [req.user!.userId, serverId, 'player_teleported_map', JSON.stringify({ playerId, name: player.name, x, y, z })]
    );

    res.json({ message: result });
  } catch (error: any) {
    console.error('Teleport from map error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/servers/:id/map/refresh - force refresh entity positions
router.get('/:id/map/refresh', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client?.isConnected()) {
      return res.status(400).json({ error: 'RCON not connected' });
    }

    // Get fresh entities from RCON
    const entities = await client.getEntities();

    // Clear old entities and store new ones
    run('DELETE FROM map_entities WHERE server_id = ?', [serverId]);

    for (const entity of entities) {
      run(
        `INSERT INTO map_entities (server_id, type, name, x, y, z, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [serverId, entity.type, entity.name, entity.x, entity.y, entity.z, JSON.stringify(entity.data)]
      );
    }

    // Also get players
    const players = await client.getPlayerList();

    res.json({
      entities: entities.length,
      players: players.length,
      message: 'Map data refreshed',
    });
  } catch (error: any) {
    console.error('Map refresh error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
