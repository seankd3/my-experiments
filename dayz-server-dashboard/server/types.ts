// Shared TypeScript types for the DayZ Server Management Dashboard backend

// ── Database Row Types ──────────────────────────────────────────────

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: 'admin' | 'user' | 'superadmin';
  created_at: string;
  subscription_tier: SubscriptionTierName;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export interface ServerRow {
  id: number;
  user_id: number;
  name: string;
  ip: string;
  port: number;
  rcon_port: number;
  rcon_password_encrypted: string;
  is_active: number; // SQLite boolean
  created_at: string;
}

export interface PlayerRow {
  id: number;
  server_id: number;
  steam_id: string;
  name: string;
  first_seen: string;
  last_seen: string;
  total_playtime_seconds: number;
  is_banned: number; // SQLite boolean
  ban_reason: string | null;
  notes: string | null;
}

export interface PlayerSessionRow {
  id: number;
  player_id: number;
  server_id: number;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number | null;
}

export interface PlayerPositionRow {
  id: number;
  player_id: number;
  server_id: number;
  x: number;
  y: number;
  z: number;
  timestamp: string;
}

export interface ChatMessageRow {
  id: number;
  server_id: number;
  player_id: number | null;
  sender_name: string;
  message: string;
  is_admin: number; // SQLite boolean
  timestamp: string;
}

export interface ScheduledTaskRow {
  id: number;
  server_id: number;
  user_id: number;
  type: 'message' | 'restart' | 'command';
  payload: string; // JSON string
  cron_expression: string | null;
  specific_time: string | null;
  is_active: number; // SQLite boolean
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

export interface AuditLogRow {
  id: number;
  user_id: number;
  server_id: number | null;
  action: string;
  details: string; // JSON string
  timestamp: string;
}

export interface SubscriptionTierRow {
  id: number;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_servers: number;
  features: string; // JSON string
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  is_active: number; // SQLite boolean
  sort_order: number;
}

export interface FeatureFlagRow {
  id: number;
  feature_key: string;
  name: string;
  description: string;
  tier_required: SubscriptionTierName;
  is_active: number; // SQLite boolean
}

export interface PlayerMetricsRow {
  id: number;
  server_id: number;
  date: string;
  peak_players: number;
  avg_players: number;
  total_unique_players: number;
  total_sessions: number;
  avg_session_duration: number;
}

export interface MapEntityRow {
  id: number;
  server_id: number;
  type: 'vehicle' | 'tent' | 'flag' | 'stash' | 'building';
  name: string;
  x: number;
  y: number;
  z: number;
  data: string; // JSON string
  last_updated: string;
}

// ── Enums / Literals ────────────────────────────────────────────────

export type SubscriptionTierName = 'free' | 'starter' | 'pro' | 'enterprise';

export type UserRole = 'admin' | 'user' | 'superadmin';

export type TaskType = 'message' | 'restart' | 'command';

export type MapEntityType = 'vehicle' | 'tent' | 'flag' | 'stash' | 'building';

// ── Request / Response Types ────────────────────────────────────────

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTierName;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateServerRequest {
  name: string;
  ip: string;
  port: number;
  rcon_port: number;
  rcon_password: string;
}

export interface UpdateServerRequest {
  name?: string;
  ip?: string;
  port?: number;
  rcon_port?: number;
  rcon_password?: string;
}

export interface KickPlayerRequest {
  reason?: string;
}

export interface BanPlayerRequest {
  reason: string;
  duration?: number; // minutes, 0 = permanent
}

export interface TeleportRequest {
  x: number;
  y: number;
  z: number;
}

export interface SendMessageRequest {
  message: string;
}

export interface PrivateMessageRequest {
  playerId: number;
  message: string;
}

export interface CreateTaskRequest {
  type: TaskType;
  payload: Record<string, unknown>;
  cron_expression?: string;
  specific_time?: string;
}

export interface UpdateTaskRequest {
  type?: TaskType;
  payload?: Record<string, unknown>;
  cron_expression?: string;
  specific_time?: string;
  is_active?: boolean;
}

export interface SpawnItemRequest {
  item: string;
  x: number;
  y: number;
  z: number;
}

export interface CheckoutRequest {
  tier_id: number;
  billing_period: 'monthly' | 'yearly';
}

// ── RCON Types ──────────────────────────────────────────────────────

export interface RCONConfig {
  ip: string;
  port: number;
  password: string;
}

export interface OnlinePlayer {
  id: number;
  steamId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  ping: number;
}

export interface InventoryItem {
  name: string;
  slot: string;
  quantity: number;
  condition: string;
}

export interface ServerStatus {
  online: boolean;
  playerCount: number;
  maxPlayers: number;
  uptime: number; // seconds
  fps: number;
  map: string;
  version: string;
}

// ── WebSocket Message Types ─────────────────────────────────────────

export type WSMessageType =
  | 'player_join'
  | 'player_leave'
  | 'player_move'
  | 'chat_message'
  | 'server_status'
  | 'entity_update'
  | 'task_executed';

export interface WSMessage {
  type: WSMessageType;
  serverId: number;
  data: unknown;
  timestamp: string;
}

// ── Express Extensions ──────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ── Pagination ──────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
