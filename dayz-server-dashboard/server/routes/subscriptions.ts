// Subscription routes: tiers, checkout, webhook, current, cancel

import express from 'express';
import { queryAll, queryOne, run } from '../db';
import { authenticate } from '../middleware/auth';
import { SubscriptionTierRow, UserRow } from '../types';

export const router = express.Router();

// GET /api/subscriptions/tiers - list available tiers (public)
router.get('/tiers', (req, res) => {
  try {
    const tiers = queryAll<SubscriptionTierRow>(
      'SELECT * FROM subscription_tiers WHERE is_active = 1 ORDER BY sort_order ASC'
    );

    res.json(tiers.map(t => ({
      id: t.id,
      name: t.name,
      price_monthly: t.price_monthly,
      price_yearly: t.price_yearly,
      max_servers: t.max_servers,
      features: JSON.parse(t.features),
      sort_order: t.sort_order,
    })));
  } catch (error: any) {
    console.error('List tiers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/checkout - create Stripe checkout session
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { tier_id, billing_period } = req.body;

    if (!tier_id || !billing_period) {
      return res.status(400).json({ error: 'tier_id and billing_period are required' });
    }

    if (!['monthly', 'yearly'].includes(billing_period)) {
      return res.status(400).json({ error: 'billing_period must be "monthly" or "yearly"' });
    }

    const tier = queryOne<SubscriptionTierRow>(
      'SELECT * FROM subscription_tiers WHERE id = ? AND is_active = 1',
      [tier_id]
    );

    if (!tier) {
      return res.status(404).json({ error: 'Subscription tier not found' });
    }

    if (tier.name === 'free') {
      return res.status(400).json({ error: 'Cannot checkout for the free tier' });
    }

    const priceId = billing_period === 'monthly'
      ? tier.stripe_price_id_monthly
      : tier.stripe_price_id_yearly;

    // In production, create a real Stripe checkout session
    // For now, simulate the checkout process
    const checkoutSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const checkoutUrl = `https://checkout.stripe.com/c/pay/${checkoutSessionId}`;

    // Log the checkout attempt
    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [
        req.user!.userId,
        'checkout_initiated',
        JSON.stringify({ tier: tier.name, billing_period, priceId }),
      ]
    );

    res.json({
      sessionId: checkoutSessionId,
      url: checkoutUrl,
      tier: tier.name,
      price: billing_period === 'monthly' ? tier.price_monthly : tier.price_yearly,
      billing_period,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    // In production, verify the Stripe webhook signature
    // const sig = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // Simulate webhook event processing
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object;
        if (session?.customer_email) {
          const user = queryOne<UserRow>(
            'SELECT * FROM users WHERE email = ?',
            [session.customer_email]
          );
          if (user) {
            const tierName = session.metadata?.tier || 'starter';
            run(
              `UPDATE users SET subscription_tier = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?`,
              [tierName, session.customer, session.subscription, user.id]
            );
            run(
              `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
              [user.id, 'subscription_activated', JSON.stringify({ tier: tierName })]
            );
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data?.object;
        if (subscription?.customer) {
          const user = queryOne<UserRow>(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [subscription.customer]
          );
          if (user) {
            // Update subscription status based on Stripe data
            run(
              `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
              [user.id, 'subscription_updated', JSON.stringify({ status: subscription.status })]
            );
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data?.object;
        if (subscription?.customer) {
          const user = queryOne<UserRow>(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [subscription.customer]
          );
          if (user) {
            run(
              `UPDATE users SET subscription_tier = 'free', stripe_subscription_id = NULL WHERE id = ?`,
              [user.id]
            );
            run(
              `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
              [user.id, 'subscription_cancelled', JSON.stringify({ previous_tier: user.subscription_tier })]
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data?.object;
        if (invoice?.customer) {
          const user = queryOne<UserRow>(
            'SELECT * FROM users WHERE stripe_customer_id = ?',
            [invoice.customer]
          );
          if (user) {
            run(
              `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
              [user.id, 'payment_failed', JSON.stringify({ amount: invoice.amount_due })]
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: `Webhook error: ${error.message}` });
  }
});

// GET /api/subscriptions/current - get user's current subscription
router.get('/current', authenticate, (req, res) => {
  try {
    const user = queryOne<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [req.user!.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tier = queryOne<SubscriptionTierRow>(
      'SELECT * FROM subscription_tiers WHERE name = ?',
      [user.subscription_tier]
    );

    const serverCount = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM servers WHERE user_id = ?',
      [user.id]
    )?.count || 0;

    res.json({
      tier: user.subscription_tier,
      tierDetails: tier ? {
        name: tier.name,
        price_monthly: tier.price_monthly,
        price_yearly: tier.price_yearly,
        max_servers: tier.max_servers,
        features: JSON.parse(tier.features),
      } : null,
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
      servers_used: serverCount,
      servers_remaining: tier ? tier.max_servers - serverCount : 0,
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscriptions/cancel - cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const user = queryOne<UserRow>(
      'SELECT * FROM users WHERE id = ?',
      [req.user!.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.subscription_tier === 'free') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // In production, cancel via Stripe API
    // await stripe.subscriptions.cancel(user.stripe_subscription_id);

    const previousTier = user.subscription_tier;

    // Downgrade to free
    run(
      `UPDATE users SET subscription_tier = 'free', stripe_subscription_id = NULL WHERE id = ?`,
      [user.id]
    );

    run(
      `INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [user.id, 'subscription_cancelled', JSON.stringify({ previous_tier: previousTier })]
    );

    res.json({
      message: 'Subscription cancelled. You have been downgraded to the free tier.',
      previous_tier: previousTier,
      current_tier: 'free',
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
