// Super admin routes (requires 'superadmin' role)

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import {
  UserRow, SubscriptionTierRow, FeatureFlagRow, AuditLogRow,
  SubscriptionTierName,
} from '../types';

export const router = express.Router();

// All routes require superadmin
router.use(authenticate);
router.use(requireRole('superadmin'));

// ── Users ──────────────────────────────────────────────────────────

// GET /api/admin/users - list all users (paginated, searchable)
router.get('/users', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const search = (req.query.search as string) || '';
    const role = req.query.role as string;
    const tier = req.query.tier as string;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      whereClause += ' AND email LIKE ?';
      params.push(`%${search}%`);
    }

    if (role && ['admin', 'user', 'superadmin'].includes(role)) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (tier && ['free', 'starter', 'pro', 'enterprise'].includes(tier)) {
      whereClause += ' AND subscription_tier = ?';
      params.push(tier);
    }

    const total = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    )?.count || 0;

    const users = queryAll<UserRow>(
      `SELECT id, email, role, created_at, subscription_tier, stripe_customer_id, stripe_subscription_id
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Add server count per user
    const usersWithStats = users.map(u => {
      const serverCount = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM servers WHERE user_id = ?',
        [u.id]
      )?.count || 0;

      return {
        ...u,
        server_count: serverCount,
      };
    });

    res.json({
      data: usersWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id - update user (role, subscription, etc.)
router.put('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role, subscription_tier } = req.body;

    const user = queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role && ['admin', 'user', 'superadmin'].includes(role)) {
      run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    if (subscription_tier && ['free', 'starter', 'pro', 'enterprise'].includes(subscription_tier)) {
      run('UPDATE users SET subscription_tier = ? WHERE id = ?', [subscription_tier, userId]);
    }

    const updated = queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user!.userId, 'admin_user_updated', JSON.stringify({ targetUserId: userId, role, subscription_tier })]
    );

    res.json({
      id: updated!.id,
      email: updated!.email,
      role: updated!.role,
      subscription_tier: updated!.subscription_tier,
      created_at: updated!.created_at,
    });
  } catch (error: any) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Subscription Tiers ─────────────────────────────────────────────

// GET /api/admin/tiers - list subscription tiers
router.get('/tiers', (req, res) => {
  try {
    const tiers = queryAll<SubscriptionTierRow>(
      'SELECT * FROM subscription_tiers ORDER BY sort_order ASC'
    );

    res.json(tiers.map(t => ({
      ...t,
      features: JSON.parse(t.features),
      is_active: !!t.is_active,
    })));
  } catch (error: any) {
    console.error('Admin list tiers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/tiers - create tier
router.post('/tiers', (req, res) => {
  try {
    const {
      name, price_monthly, price_yearly, max_servers, features,
      stripe_price_id_monthly, stripe_price_id_yearly, sort_order,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tier name is required' });
    }

    const result = run(
      `INSERT INTO subscription_tiers (name, price_monthly, price_yearly, max_servers, features, stripe_price_id_monthly, stripe_price_id_yearly, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        price_monthly || 0,
        price_yearly || 0,
        max_servers || 1,
        JSON.stringify(features || []),
        stripe_price_id_monthly || null,
        stripe_price_id_yearly || null,
        sort_order || 0,
      ]
    );

    const tier = queryOne<SubscriptionTierRow>('SELECT * FROM subscription_tiers WHERE id = ?', [result.lastInsertRowid]);

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user!.userId, 'tier_created', JSON.stringify({ name })]
    );

    res.status(201).json({
      ...tier,
      features: JSON.parse(tier!.features),
      is_active: !!tier!.is_active,
    });
  } catch (error: any) {
    console.error('Admin create tier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/tiers/:id - update tier
router.put('/tiers/:id', (req, res) => {
  try {
    const tierId = parseInt(req.params.id);
    const tier = queryOne<SubscriptionTierRow>('SELECT * FROM subscription_tiers WHERE id = ?', [tierId]);

    if (!tier) {
      return res.status(404).json({ error: 'Tier not found' });
    }

    const {
      name, price_monthly, price_yearly, max_servers, features,
      stripe_price_id_monthly, stripe_price_id_yearly, is_active, sort_order,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (price_monthly !== undefined) { updates.push('price_monthly = ?'); params.push(price_monthly); }
    if (price_yearly !== undefined) { updates.push('price_yearly = ?'); params.push(price_yearly); }
    if (max_servers !== undefined) { updates.push('max_servers = ?'); params.push(max_servers); }
    if (features !== undefined) { updates.push('features = ?'); params.push(JSON.stringify(features)); }
    if (stripe_price_id_monthly !== undefined) { updates.push('stripe_price_id_monthly = ?'); params.push(stripe_price_id_monthly); }
    if (stripe_price_id_yearly !== undefined) { updates.push('stripe_price_id_yearly = ?'); params.push(stripe_price_id_yearly); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }

    if (updates.length > 0) {
      params.push(tierId);
      run(`UPDATE subscription_tiers SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = queryOne<SubscriptionTierRow>('SELECT * FROM subscription_tiers WHERE id = ?', [tierId]);

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user!.userId, 'tier_updated', JSON.stringify({ tierId, name })]
    );

    res.json({
      ...updated,
      features: JSON.parse(updated!.features),
      is_active: !!updated!.is_active,
    });
  } catch (error: any) {
    console.error('Admin update tier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/tiers/:id - deactivate tier
router.delete('/tiers/:id', (req, res) => {
  try {
    const tierId = parseInt(req.params.id);
    const tier = queryOne<SubscriptionTierRow>('SELECT * FROM subscription_tiers WHERE id = ?', [tierId]);

    if (!tier) {
      return res.status(404).json({ error: 'Tier not found' });
    }

    // Don't delete, just deactivate
    run('UPDATE subscription_tiers SET is_active = 0 WHERE id = ?', [tierId]);

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user!.userId, 'tier_deactivated', JSON.stringify({ tierId, name: tier.name })]
    );

    res.json({ message: `Tier '${tier.name}' deactivated` });
  } catch (error: any) {
    console.error('Admin delete tier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Feature Flags ──────────────────────────────────────────────────

// GET /api/admin/features - list feature flags
router.get('/features', (req, res) => {
  try {
    const flags = queryAll<FeatureFlagRow>(
      'SELECT * FROM feature_flags ORDER BY tier_required ASC, name ASC'
    );

    res.json(flags.map(f => ({
      ...f,
      is_active: !!f.is_active,
    })));
  } catch (error: any) {
    console.error('Admin list features error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/features - create feature flag
router.post('/features', (req, res) => {
  try {
    const { feature_key, name, description, tier_required } = req.body;

    if (!feature_key || !name) {
      return res.status(400).json({ error: 'feature_key and name are required' });
    }

    const result = run(
      `INSERT INTO feature_flags (feature_key, name, description, tier_required)
       VALUES (?, ?, ?, ?)`,
      [feature_key, name, description || '', tier_required || 'free']
    );

    const flag = queryOne<FeatureFlagRow>('SELECT * FROM feature_flags WHERE id = ?', [result.lastInsertRowid]);

    res.status(201).json({
      ...flag,
      is_active: !!flag!.is_active,
    });
  } catch (error: any) {
    console.error('Admin create feature error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/features/:id - update feature flag
router.put('/features/:id', (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const flag = queryOne<FeatureFlagRow>('SELECT * FROM feature_flags WHERE id = ?', [flagId]);

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    const { feature_key, name, description, tier_required, is_active } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (feature_key !== undefined) { updates.push('feature_key = ?'); params.push(feature_key); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (tier_required !== undefined) { updates.push('tier_required = ?'); params.push(tier_required); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(flagId);
      run(`UPDATE feature_flags SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = queryOne<FeatureFlagRow>('SELECT * FROM feature_flags WHERE id = ?', [flagId]);

    res.json({
      ...updated,
      is_active: !!updated!.is_active,
    });
  } catch (error: any) {
    console.error('Admin update feature error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/features/:id - delete feature flag
router.delete('/features/:id', (req, res) => {
  try {
    const flagId = parseInt(req.params.id);
    const flag = queryOne<FeatureFlagRow>('SELECT * FROM feature_flags WHERE id = ?', [flagId]);

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    run('DELETE FROM feature_flags WHERE id = ?', [flagId]);

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [req.user!.userId, 'feature_deleted', JSON.stringify({ flagId, key: flag.feature_key })]
    );

    res.json({ message: `Feature flag '${flag.feature_key}' deleted` });
  } catch (error: any) {
    console.error('Admin delete feature error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Platform Statistics ────────────────────────────────────────────

// GET /api/admin/stats - platform-wide statistics
router.get('/stats', (req, res) => {
  try {
    const totalUsers = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM users'
    )?.count || 0;

    const usersByTier = queryAll<{ tier: string; count: number }>(
      'SELECT subscription_tier as tier, COUNT(*) as count FROM users GROUP BY subscription_tier'
    );

    const usersByRole = queryAll<{ role: string; count: number }>(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );

    const totalServers = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM servers'
    )?.count || 0;

    const totalPlayers = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM players'
    )?.count || 0;

    const totalSessions = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM player_sessions'
    )?.count || 0;

    const totalChatMessages = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM chat_messages'
    )?.count || 0;

    const totalTasks = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM scheduled_tasks'
    )?.count || 0;

    // Revenue estimation
    const paidUsers = queryAll<{ tier: string; count: number }>(
      `SELECT subscription_tier as tier, COUNT(*) as count FROM users
       WHERE subscription_tier != 'free' GROUP BY subscription_tier`
    );

    const tierPrices: Record<string, number> = {};
    const tiers = queryAll<SubscriptionTierRow>('SELECT * FROM subscription_tiers');
    for (const t of tiers) {
      tierPrices[t.name] = t.price_monthly;
    }

    let estimatedMRR = 0;
    for (const pu of paidUsers) {
      estimatedMRR += (tierPrices[pu.tier] || 0) * pu.count;
    }

    // New users this week
    const newUsersThisWeek = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')`
    )?.count || 0;

    res.json({
      users: {
        total: totalUsers,
        byTier: usersByTier,
        byRole: usersByRole,
        newThisWeek: newUsersThisWeek,
      },
      servers: {
        total: totalServers,
      },
      players: {
        total: totalPlayers,
        totalSessions: totalSessions,
      },
      content: {
        chatMessages: totalChatMessages,
        scheduledTasks: totalTasks,
      },
      revenue: {
        estimatedMRR: Math.round(estimatedMRR * 100) / 100,
        paidUsers: paidUsers,
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Audit Log ──────────────────────────────────────────────────────

// GET /api/admin/audit-log - get audit log entries
router.get('/audit-log', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const action = req.query.action as string;
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }

    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    const total = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM audit_log ${whereClause}`,
      params
    )?.count || 0;

    const logs = queryAll<AuditLogRow>(
      `SELECT audit_log.*, users.email as user_email
       FROM audit_log
       LEFT JOIN users ON audit_log.user_id = users.id
       ${whereClause}
       ORDER BY audit_log.timestamp DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const parsed = logs.map(l => ({
      ...l,
      details: JSON.parse(l.details),
    }));

    res.json({
      data: parsed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Admin audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
