// Server management routes

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate } from '../middleware/auth';
import { createRCONClient, setConnection, getConnection, removeConnection } from '../rcon/client';
import { attachEventListeners } from '../services/playerTracker';
import { ServerRow, CreateServerRequest, UpdateServerRequest } from '../types';

export const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/servers - list user's servers
router.get('/', (req, res) => {
  try {
    const servers = queryAll<ServerRow>(
      'SELECT id, user_id, name, ip, port, rcon_port, is_active, created_at FROM servers WHERE user_id = ?',
      [req.user!.userId]
    );

    // Add connection status
    const serversWithStatus = servers.map(s => ({
      ...s,
      is_connected: getConnection(s.id)?.isConnected() ?? false,
    }));

    res.json(serversWithStatus);
  } catch (error: any) {
    console.error('List servers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers - add a server
router.post('/', (req, res) => {
  try {
    const { name, ip, port, rcon_port, rcon_password } = req.body as CreateServerRequest;

    if (!name || !ip || !port || !rcon_port || !rcon_password) {
      return res.status(400).json({ error: 'All fields are required: name, ip, port, rcon_port, rcon_password' });
    }

    // Check server limit based on subscription tier
    const serverCount = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM servers WHERE user_id = ?',
      [req.user!.userId]
    );

    const tierLimits: Record<string, number> = { free: 1, starter: 3, pro: 10, enterprise: 50 };
    const maxServers = tierLimits[req.user!.subscriptionTier] || 1;

    if ((serverCount?.count || 0) >= maxServers) {
      return res.status(403).json({
        error: `Server limit reached. Your ${req.user!.subscriptionTier} plan allows ${maxServers} server(s).`,
        max_servers: maxServers,
        current_count: serverCount?.count || 0,
      });
    }

    // Simple encryption placeholder (in production, use proper encryption)
    const encryptedPassword = Buffer.from(rcon_password).toString('base64');

    const result = run(
      `INSERT INTO servers (user_id, name, ip, port, rcon_port, rcon_password_encrypted)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user!.userId, name, ip, port, rcon_port, encryptedPassword]
    );

    const server = queryOne<ServerRow>('SELECT * FROM servers WHERE id = ?', [result.lastInsertRowid]);

    // Audit log
    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, server!.id, 'server_created', JSON.stringify({ name, ip, port })]
    );

    res.status(201).json({
      id: server!.id,
      user_id: server!.user_id,
      name: server!.name,
      ip: server!.ip,
      port: server!.port,
      rcon_port: server!.rcon_port,
      is_active: server!.is_active,
      created_at: server!.created_at,
    });
  } catch (error: any) {
    console.error('Create server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/servers/:id - update server
router.put('/:id', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = queryOne<ServerRow>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user!.userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const { name, ip, port, rcon_port, rcon_password } = req.body as UpdateServerRequest;

    if (name) run('UPDATE servers SET name = ? WHERE id = ?', [name, serverId]);
    if (ip) run('UPDATE servers SET ip = ? WHERE id = ?', [ip, serverId]);
    if (port) run('UPDATE servers SET port = ? WHERE id = ?', [port, serverId]);
    if (rcon_port) run('UPDATE servers SET rcon_port = ? WHERE id = ?', [rcon_port, serverId]);
    if (rcon_password) {
      const encrypted = Buffer.from(rcon_password).toString('base64');
      run('UPDATE servers SET rcon_password_encrypted = ? WHERE id = ?', [encrypted, serverId]);
    }

    const updated = queryOne<ServerRow>('SELECT * FROM servers WHERE id = ?', [serverId]);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'server_updated', JSON.stringify({ name, ip, port })]
    );

    res.json({
      id: updated!.id,
      user_id: updated!.user_id,
      name: updated!.name,
      ip: updated!.ip,
      port: updated!.port,
      rcon_port: updated!.rcon_port,
      is_active: updated!.is_active,
      created_at: updated!.created_at,
    });
  } catch (error: any) {
    console.error('Update server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/servers/:id - delete server
router.delete('/:id', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = queryOne<ServerRow>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user!.userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Disconnect RCON if connected
    removeConnection(serverId);

    run('DELETE FROM servers WHERE id = ?', [serverId]);

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user!.userId, 'server_deleted', JSON.stringify({ serverId, name: server.name })]
    );

    res.json({ message: 'Server deleted' });
  } catch (error: any) {
    console.error('Delete server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:id/connect - connect RCON
router.post('/:id/connect', async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = queryOne<ServerRow>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user!.userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if already connected
    const existing = getConnection(serverId);
    if (existing?.isConnected()) {
      return res.json({ message: 'Already connected', status: 'connected' });
    }

    // Decrypt password
    const password = Buffer.from(server.rcon_password_encrypted, 'base64').toString('utf-8');

    const client = createRCONClient({
      ip: server.ip,
      port: server.rcon_port,
      password,
    });

    await client.connect();
    setConnection(serverId, client);

    // Attach event listeners for player tracking
    attachEventListeners(serverId);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'rcon_connected', JSON.stringify({ ip: server.ip })]
    );

    res.json({ message: 'Connected to RCON', status: 'connected' });
  } catch (error: any) {
    console.error('RCON connect error:', error);
    res.status(500).json({ error: `Failed to connect: ${error.message}` });
  }
});

// POST /api/servers/:id/disconnect - disconnect RCON
router.post('/:id/disconnect', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = queryOne<ServerRow>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user!.userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    removeConnection(serverId);

    run(
      `INSERT INTO audit_log (user_id, server_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user!.userId, serverId, 'rcon_disconnected', JSON.stringify({ ip: server.ip })]
    );

    res.json({ message: 'Disconnected from RCON', status: 'disconnected' });
  } catch (error: any) {
    console.error('RCON disconnect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:id/status - get server status
router.get('/:id/status', (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const server = queryOne<ServerRow>(
      'SELECT * FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user!.userId]
    );

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = getConnection(serverId);
    if (!client || !client.isConnected()) {
      return res.json({
        online: false,
        playerCount: 0,
        maxPlayers: 60,
        uptime: 0,
        fps: 0,
        map: 'chernarusplus',
        version: 'N/A',
        rcon_connected: false,
      });
    }

    const status = client.getServerStatus();
    res.json({ ...status, rcon_connected: true });
  } catch (error: any) {
    console.error('Server status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
