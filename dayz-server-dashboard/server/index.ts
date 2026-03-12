// Main Express server entry point for the DayZ Server Management Dashboard

import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';

// Initialize database (this triggers table creation check)
import { getDb } from './db';
import { ALL_TABLES, CREATE_INDEXES } from './db/schema';

// Services
import { initWebSocket } from './services/websocket';
import { startScheduler, stopScheduler } from './services/scheduler';
import { startPlayerTracker, stopPlayerTracker } from './services/playerTracker';

// Routes
import { router as authRoutes } from './routes/auth';
import { router as serverRoutes } from './routes/servers';
import { router as playerRoutes } from './routes/players';
import { router as chatRoutes } from './routes/chat';
import { router as automationRoutes } from './routes/automation';
import { router as mapRoutes } from './routes/map';
import { router as analyticsRoutes } from './routes/analytics';
import { router as subscriptionRoutes } from './routes/subscriptions';
import { router as adminRoutes } from './routes/admin';

const PORT = parseInt(process.env.PORT || '3001', 10);

// ── Initialize Express ──────────────────────────────────────────────

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Body parsing - JSON for most routes
// Note: Stripe webhook needs raw body, handled in the subscriptions route
app.use((req, res, next) => {
  if (req.path === '/api/subscriptions/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

// ── Initialize Database ─────────────────────────────────────────────

function initDatabase(): void {
  const db = getDb();

  // Ensure tables exist (idempotent)
  for (const tableSql of ALL_TABLES) {
    db.exec(tableSql);
  }
  for (const indexSql of CREATE_INDEXES) {
    db.exec(indexSql);
  }

  console.log('Database initialized');
}

// ── REST API Routes ─────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/servers', playerRoutes);       // /api/servers/:id/players/...
app.use('/api/servers', chatRoutes);         // /api/servers/:id/chat/...
app.use('/api/servers', automationRoutes);   // /api/servers/:id/tasks/...
app.use('/api/servers', mapRoutes);          // /api/servers/:id/map/...
app.use('/api/servers', analyticsRoutes);    // /api/servers/:id/analytics/...
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Static File Serving (Production) ────────────────────────────────

const clientDistPath = path.join(__dirname, '..', 'dist', 'client');
app.use(express.static(clientDistPath));

// SPA fallback: serve index.html for any non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('DayZ Server Dashboard - Backend running. Start the frontend dev server for the UI.');
    }
  });
});

// ── Error Handling ──────────────────────────────────────────────────

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ────────────────────────────────────────────────────

function start(): void {
  // Initialize database
  initDatabase();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket server
  initWebSocket(server);

  // Start services
  startScheduler();
  startPlayerTracker();

  // Listen
  server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  DayZ Server Dashboard`);
    console.log(`  Backend running on port ${PORT}`);
    console.log(`  API: http://localhost:${PORT}/api`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`========================================\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down gracefully...');
    stopScheduler();
    stopPlayerTracker();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();

export default app;
