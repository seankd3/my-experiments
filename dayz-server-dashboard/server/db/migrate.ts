// Migration script: creates all tables and seeds default data

import { getDb, closeDb } from './index';
import { ALL_TABLES, CREATE_INDEXES } from './schema';
import bcrypt from 'bcryptjs';

function migrate(): void {
  const db = getDb();

  console.log('Running migrations...');

  // Create all tables
  for (const tableSql of ALL_TABLES) {
    db.exec(tableSql);
  }
  console.log('  ✓ Tables created');

  // Create indexes
  for (const indexSql of CREATE_INDEXES) {
    db.exec(indexSql);
  }
  console.log('  ✓ Indexes created');

  // Seed subscription tiers
  const existingTiers = db.prepare('SELECT COUNT(*) as count FROM subscription_tiers').get() as { count: number };
  if (existingTiers.count === 0) {
    const insertTier = db.prepare(`
      INSERT INTO subscription_tiers (name, price_monthly, price_yearly, max_servers, features, stripe_price_id_monthly, stripe_price_id_yearly, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const tiers = [
      {
        name: 'free',
        price_monthly: 0,
        price_yearly: 0,
        max_servers: 1,
        features: JSON.stringify(['player_management', 'chat']),
        stripe_monthly: null,
        stripe_yearly: null,
        sort_order: 0,
      },
      {
        name: 'starter',
        price_monthly: 9.99,
        price_yearly: 99.99,
        max_servers: 3,
        features: JSON.stringify(['player_management', 'chat', 'automation', 'admin_commands']),
        stripe_monthly: 'price_starter_monthly',
        stripe_yearly: 'price_starter_yearly',
        sort_order: 1,
      },
      {
        name: 'pro',
        price_monthly: 24.99,
        price_yearly: 249.99,
        max_servers: 10,
        features: JSON.stringify(['player_management', 'chat', 'automation', 'admin_commands', 'map', 'analytics']),
        stripe_monthly: 'price_pro_monthly',
        stripe_yearly: 'price_pro_yearly',
        sort_order: 2,
      },
      {
        name: 'enterprise',
        price_monthly: 49.99,
        price_yearly: 499.99,
        max_servers: 50,
        features: JSON.stringify(['player_management', 'chat', 'automation', 'admin_commands', 'map', 'analytics', 'api_access']),
        stripe_monthly: 'price_enterprise_monthly',
        stripe_yearly: 'price_enterprise_yearly',
        sort_order: 3,
      },
    ];

    const insertMany = db.transaction(() => {
      for (const tier of tiers) {
        insertTier.run(
          tier.name,
          tier.price_monthly,
          tier.price_yearly,
          tier.max_servers,
          tier.features,
          tier.stripe_monthly,
          tier.stripe_yearly,
          tier.sort_order
        );
      }
    });
    insertMany();
    console.log('  ✓ Subscription tiers seeded');
  } else {
    console.log('  - Subscription tiers already exist, skipping');
  }

  // Seed feature flags
  const existingFlags = db.prepare('SELECT COUNT(*) as count FROM feature_flags').get() as { count: number };
  if (existingFlags.count === 0) {
    const insertFlag = db.prepare(`
      INSERT INTO feature_flags (feature_key, name, description, tier_required, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const flags = [
      { key: 'player_management', name: 'Player Management', description: 'View and manage players on your servers', tier: 'free' },
      { key: 'chat', name: 'Chat', description: 'View and send chat messages', tier: 'free' },
      { key: 'admin_commands', name: 'Admin Commands', description: 'Execute admin commands (kick, ban, teleport, heal, godmode)', tier: 'starter' },
      { key: 'automation', name: 'Automation', description: 'Schedule automated tasks like messages and restarts', tier: 'starter' },
      { key: 'map', name: 'Interactive Map', description: 'View player positions and entities on an interactive map', tier: 'pro' },
      { key: 'analytics', name: 'Analytics', description: 'View server analytics and player metrics', tier: 'pro' },
      { key: 'api_access', name: 'API Access', description: 'Programmatic API access for custom integrations', tier: 'enterprise' },
    ];

    const insertMany = db.transaction(() => {
      for (const flag of flags) {
        insertFlag.run(flag.key, flag.name, flag.description, flag.tier);
      }
    });
    insertMany();
    console.log('  ✓ Feature flags seeded');
  } else {
    console.log('  - Feature flags already exist, skipping');
  }

  // Seed default superadmin user
  const existingAdmin = db.prepare("SELECT COUNT(*) as count FROM users WHERE email = ?").get('admin@dayz-dashboard.com') as { count: number };
  if (existingAdmin.count === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 12);
    db.prepare(`
      INSERT INTO users (email, password_hash, role, subscription_tier)
      VALUES (?, ?, 'superadmin', 'enterprise')
    `).run('admin@dayz-dashboard.com', passwordHash);
    console.log('  ✓ Default superadmin user created (admin@dayz-dashboard.com / admin123)');
  } else {
    console.log('  - Superadmin user already exists, skipping');
  }

  console.log('Migration complete!');
}

// Run if executed directly
migrate();
closeDb();
