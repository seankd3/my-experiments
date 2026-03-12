// Chat routes: history, global message, private message

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate, requireFeature } from '../middleware/auth';
import { getConnection } from '../rcon/client';
import { ServerRow, ChatMessageRow, PlayerRow } from '../types';

export const router = express.Router();

router.use(authenticate);
router.use(requireFeature('chat'));

// Helper: verify server ownership
function verifyServer(serverId: number, userId: number): ServerRow | null {
  return queryOne<ServerRow>(
    'SELECT * FROM servers WHERE id = ? AND user_id = ?',
    [serverId, userId]
  ) || null;
}

// GET /api/servers/:id/chat - get chat history (paginated)
router.get('/:id/chat', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    if (!verifyServer(serverId, req.user!.userId)) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const since = req.query.since as string;

    let whereClause = 'WHERE server_id = ?';
    const params: unknown[] = [serverId];

    if (since) {
      whereClause += ' AND timestamp >= ?';
      params.push(since);
    }

    const total = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM chat_messages ${whereClause}`,
      params
    )?.count || 0;

    const messages = queryAll<ChatMessageRow>(
      `SELECT * FROM chat_messages ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:id/chat - send global message
router.post('/:id/chat', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
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

    await client.sendGlobalMessage(message);

    // Store in DB
    run(
      `INSERT INTO chat_messages (server_id, sender_name, message, is_admin) VALUES (?, ?, ?, 1)`,
      [serverId, `Admin (${req.user!.email})`, message]
    );

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'global_message_sent', JSON.stringify({ message })]
    );

    res.json({ message: 'Global message sent' });
  } catch (error: any) {
    console.error('Send global message error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/servers/:id/chat/private - send private message to player
router.post('/:id/chat/private', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { playerId, message } = req.body;

    if (!playerId || !message) {
      return res.status(400).json({ error: 'playerId and message are required' });
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

    await client.sendPrivateMessage(onlinePlayer.id, message);

    // Store in DB
    run(
      `INSERT INTO chat_messages (server_id, player_id, sender_name, message, is_admin) VALUES (?, ?, ?, ?, 1)`,
      [serverId, playerId, `Admin -> ${player.name}`, message]
    );

    res.json({ message: `Private message sent to ${player.name}` });
  } catch (error: any) {
    console.error('Send private message error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
