// JWT authentication and authorization middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload, SubscriptionTierName, UserRole } from '../types';
import { queryOne } from '../db';
import { FeatureFlagRow, SubscriptionTierRow } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dayz-dashboard-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTierName, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

/**
 * Middleware: validates JWT token from Authorization header.
 * Attaches user payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header provided' });
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory: checks if user has one of the required roles.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: checks if the user's subscription tier has access to a given feature.
 * Looks up the feature_flags table to determine the minimum required tier.
 */
export function requireFeature(featureKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Superadmins bypass feature checks
    if (req.user.role === 'superadmin') {
      next();
      return;
    }

    const feature = queryOne<FeatureFlagRow>(
      'SELECT * FROM feature_flags WHERE feature_key = ? AND is_active = 1',
      [featureKey]
    );

    if (!feature) {
      res.status(404).json({ error: `Feature '${featureKey}' not found or disabled` });
      return;
    }

    const userTierLevel = TIER_HIERARCHY[req.user.subscriptionTier] ?? 0;
    const requiredTierLevel = TIER_HIERARCHY[feature.tier_required as SubscriptionTierName] ?? 0;

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({
        error: `This feature requires the '${feature.tier_required}' subscription tier or higher`,
        required_tier: feature.tier_required,
        current_tier: req.user.subscriptionTier,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: checks if user has at minimum the specified subscription tier.
 */
export function requireSubscription(minimumTier: SubscriptionTierName) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Superadmins bypass subscription checks
    if (req.user.role === 'superadmin') {
      next();
      return;
    }

    const userTierLevel = TIER_HIERARCHY[req.user.subscriptionTier] ?? 0;
    const requiredTierLevel = TIER_HIERARCHY[minimumTier] ?? 0;

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({
        error: `This action requires the '${minimumTier}' subscription tier or higher`,
        required_tier: minimumTier,
        current_tier: req.user.subscriptionTier,
      });
      return;
    }

    next();
  };
}
