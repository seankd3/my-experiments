// Auth routes: register, login, profile

import express from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run } from '../db';
import { generateToken, authenticate } from '../middleware/auth';
import { UserRow, RegisterRequest, LoginRequest } from '../types';

export const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body as RegisterRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = queryOne<UserRow>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = run(
      `INSERT INTO users (email, password_hash, role, subscription_tier) VALUES (?, ?, 'user', 'free')`,
      [email, passwordHash]
    );

    const user = queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscription_tier,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = queryOne<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscription_tier,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription_tier: user.subscription_tier,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [req.user!.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      subscription_tier: user.subscription_tier,
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
      created_at: user.created_at,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/auth/me
router.put('/me', authenticate, async (req, res) => {
  try {
    const { email, password, currentPassword } = req.body;
    const userId = req.user!.userId;

    const user = queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing password, verify current password
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      const newHash = await bcrypt.hash(password, 12);
      run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    }

    // If changing email, check uniqueness
    if (email && email !== user.email) {
      const existing = queryOne<UserRow>('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      run('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    }

    const updated = queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({
      id: updated!.id,
      email: updated!.email,
      role: updated!.role,
      subscription_tier: updated!.subscription_tier,
      created_at: updated!.created_at,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
