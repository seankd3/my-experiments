// SQLite schema definitions for the DayZ Server Management Dashboard

export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'superadmin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK(subscription_tier IN ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);`;

export const CREATE_SERVERS_TABLE = `
CREATE TABLE IF NOT EXISTS servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  rcon_port INTEGER NOT NULL,
  rcon_password_encrypted TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`;

export const CREATE_PLAYERS_TABLE = `
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  steam_id TEXT NOT NULL,
  name TEXT NOT NULL,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  total_playtime_seconds INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  ban_reason TEXT,
  notes TEXT,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`;

export const CREATE_PLAYER_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS player_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  server_id INTEGER NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  left_at TEXT,
  duration_seconds INTEGER,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`;

export const CREATE_PLAYER_POSITIONS_TABLE = `
CREATE TABLE IF NOT EXISTS player_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  server_id INTEGER NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`;

export const CREATE_CHAT_MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  player_id INTEGER,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
);`;

export const CREATE_SCHEDULED_TASKS_TABLE = `
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('message', 'restart', 'command')),
  payload TEXT NOT NULL DEFAULT '{}',
  cron_expression TEXT,
  specific_time TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_run TEXT,
  next_run TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`;

export const CREATE_AUDIT_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  server_id INTEGER,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL
);`;

export const CREATE_SUBSCRIPTION_TIERS_TABLE = `
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  price_monthly REAL NOT NULL DEFAULT 0,
  price_yearly REAL NOT NULL DEFAULT 0,
  max_servers INTEGER NOT NULL DEFAULT 1,
  features TEXT NOT NULL DEFAULT '[]',
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);`;

export const CREATE_FEATURE_FLAGS_TABLE = `
CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tier_required TEXT NOT NULL DEFAULT 'free' CHECK(tier_required IN ('free', 'starter', 'pro', 'enterprise')),
  is_active INTEGER NOT NULL DEFAULT 1
);`;

export const CREATE_PLAYER_METRICS_TABLE = `
CREATE TABLE IF NOT EXISTS player_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  peak_players INTEGER NOT NULL DEFAULT 0,
  avg_players REAL NOT NULL DEFAULT 0,
  total_unique_players INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  avg_session_duration REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`;

export const CREATE_MAP_ENTITIES_TABLE = `
CREATE TABLE IF NOT EXISTS map_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('vehicle', 'tent', 'flag', 'stash', 'building')),
  name TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  z REAL NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`;

// Indexes for performance
export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_servers_user_id ON servers(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_players_server_id ON players(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_players_steam_id ON players(steam_id);`,
  `CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id ON player_sessions(player_id);`,
  `CREATE INDEX IF NOT EXISTS idx_player_sessions_server_id ON player_sessions(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_player_positions_player_id ON player_positions(player_id);`,
  `CREATE INDEX IF NOT EXISTS idx_player_positions_server_id ON player_positions(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_server_id ON chat_messages(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_server_id ON scheduled_tasks(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_server_id ON audit_log(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_player_metrics_server_id ON player_metrics(server_id);`,
  `CREATE INDEX IF NOT EXISTS idx_player_metrics_date ON player_metrics(date);`,
  `CREATE INDEX IF NOT EXISTS idx_map_entities_server_id ON map_entities(server_id);`,
];

export const ALL_TABLES = [
  CREATE_USERS_TABLE,
  CREATE_SERVERS_TABLE,
  CREATE_PLAYERS_TABLE,
  CREATE_PLAYER_SESSIONS_TABLE,
  CREATE_PLAYER_POSITIONS_TABLE,
  CREATE_CHAT_MESSAGES_TABLE,
  CREATE_SCHEDULED_TASKS_TABLE,
  CREATE_AUDIT_LOG_TABLE,
  CREATE_SUBSCRIPTION_TIERS_TABLE,
  CREATE_FEATURE_FLAGS_TABLE,
  CREATE_PLAYER_METRICS_TABLE,
  CREATE_MAP_ENTITIES_TABLE,
];
