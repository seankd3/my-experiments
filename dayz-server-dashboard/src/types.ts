export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  subscription?: Subscription;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Server {
  id: string;
  name: string;
  ip: string;
  port: number;
  rconPort: number;
  maxPlayers: number;
  currentPlayers: number;
  status: 'online' | 'offline' | 'restarting';
  uptime: number;
  map: string;
  version: string;
  modCount: number;
}

export interface ServerStatus {
  online: boolean;
  players: number;
  maxPlayers: number;
  uptime: number;
  fps: number;
  memory: number;
  cpu: number;
}

export interface Player {
  id: string;
  name: string;
  steamId: string;
  status: 'online' | 'offline';
  position?: Position;
  direction?: number;
  health?: number;
  playtime: number;
  lastSeen: string;
  firstSeen: string;
  ip?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  banReason?: string;
  notes?: string;
  sessions?: Session[];
  inventory?: InventoryItem[];
  banHistory?: BanRecord[];
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Session {
  id: string;
  startTime: string;
  endTime?: string;
  duration: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  slot: string;
}

export interface BanRecord {
  id: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  expiresAt?: string;
  lifted?: boolean;
}

export interface ChatMessage {
  id: string;
  playerId?: string;
  playerName: string;
  message: string;
  type: 'global' | 'admin' | 'system' | 'private';
  timestamp: string;
  isAdmin?: boolean;
}

export interface ScheduledTask {
  id: string;
  name: string;
  type: 'message' | 'restart' | 'command';
  config: {
    message?: string;
    command?: string;
    target?: string;
    warningMinutes?: number;
  };
  cronExpression: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
}

export interface MapEntity {
  id: string;
  type: 'player' | 'vehicle' | 'tent' | 'flag' | 'stash';
  name: string;
  position: Position;
  direction?: number;
  metadata?: Record<string, unknown>;
  trail?: Position[];
}

export interface MapFilters {
  showPlayers: boolean;
  showVehicles: boolean;
  showTents: boolean;
  showFlags: boolean;
  showStashes: boolean;
  showTrails: boolean;
  showLabels: boolean;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  maxServers: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

export interface Subscription {
  id: string;
  tierId: string;
  tierName: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface AnalyticsData {
  playerCountHistory: { time: string; count: number }[];
  peakHours: { hour: number; avgPlayers: number }[];
  sessionDistribution: { range: string; count: number }[];
  retentionData: { day: number; percentage: number }[];
  topPlayers: { name: string; playtime: number; sessions: number }[];
  metrics: {
    avgPlayers: number;
    peakPlayers: number;
    totalUnique: number;
    avgSessionLength: number;
    uptimePercentage: number;
    newPlayers: number;
    returningPlayers: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  mrr: number;
  totalServers: number;
  userGrowth: { date: string; count: number }[];
  revenueHistory: { date: string; amount: number }[];
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  minimumTier: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
