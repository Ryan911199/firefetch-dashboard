/**
 * Database Connection Module
 * 
 * Handles database initialization, schema setup, and connection management.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file location - use persistent volume in Docker
const DB_DIR = process.env.DB_PATH || '/app/data';
const DB_FILE = path.join(DB_DIR, 'dashboard.db');

// Ensure database directory exists
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Singleton database instance
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    ensureDbDir();
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 10000');
    db.pragma('temp_store = MEMORY');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = db!;

  // System metrics - live data (1 minute resolution, kept for 24 hours)
  database.exec(`
    CREATE TABLE IF NOT EXISTS metrics_live (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      cpu_percent REAL NOT NULL,
      memory_used INTEGER NOT NULL,
      memory_total INTEGER NOT NULL,
      memory_percent REAL NOT NULL,
      disk_used INTEGER NOT NULL,
      disk_total INTEGER NOT NULL,
      disk_percent REAL NOT NULL,
      network_rx INTEGER NOT NULL,
      network_tx INTEGER NOT NULL,
      load_1m REAL,
      load_5m REAL,
      load_15m REAL,
      uptime INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_live_timestamp ON metrics_live(timestamp);
  `);

  // System metrics - hourly aggregates (kept for 7 days)
  database.exec(`
    CREATE TABLE IF NOT EXISTS metrics_hourly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      cpu_avg REAL NOT NULL,
      cpu_max REAL NOT NULL,
      memory_avg REAL NOT NULL,
      memory_max REAL NOT NULL,
      disk_avg REAL NOT NULL,
      disk_max REAL NOT NULL,
      network_rx_total INTEGER NOT NULL,
      network_tx_total INTEGER NOT NULL,
      sample_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_hourly_timestamp ON metrics_hourly(timestamp);
  `);

  // System metrics - daily aggregates (kept for 30 days)
  database.exec(`
    CREATE TABLE IF NOT EXISTS metrics_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      cpu_avg REAL NOT NULL,
      cpu_max REAL NOT NULL,
      memory_avg REAL NOT NULL,
      memory_max REAL NOT NULL,
      disk_avg REAL NOT NULL,
      disk_max REAL NOT NULL,
      network_rx_total INTEGER NOT NULL,
      network_tx_total INTEGER NOT NULL,
      sample_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_daily_timestamp ON metrics_daily(timestamp);
  `);

  // Docker container stats
  database.exec(`
    CREATE TABLE IF NOT EXISTS container_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      container_id TEXT NOT NULL,
      container_name TEXT NOT NULL,
      cpu_percent REAL NOT NULL,
      memory_used INTEGER NOT NULL,
      memory_limit INTEGER NOT NULL,
      network_rx INTEGER,
      network_tx INTEGER,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_container_stats_timestamp ON container_stats(timestamp);
    CREATE INDEX IF NOT EXISTS idx_container_stats_container ON container_stats(container_id);
    CREATE INDEX IF NOT EXISTS idx_container_stats_composite ON container_stats(container_id, timestamp);
  `);

  // Service status history
  database.exec(`
    CREATE TABLE IF NOT EXISTS service_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time INTEGER,
      uptime_percent REAL
    );
    CREATE INDEX IF NOT EXISTS idx_service_status_timestamp ON service_status(timestamp);
    CREATE INDEX IF NOT EXISTS idx_service_status_service ON service_status(service_id);
    CREATE INDEX IF NOT EXISTS idx_service_status_composite ON service_status(service_id, timestamp);
  `);

  // Notifications/alerts
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      service_id TEXT,
      read INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    CREATE INDEX IF NOT EXISTS idx_notifications_composite ON notifications(read, timestamp);
  `);

  // Aggregation tracking
  database.exec(`
    CREATE TABLE IF NOT EXISTS aggregation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aggregation_type TEXT NOT NULL,
      last_run INTEGER NOT NULL,
      records_processed INTEGER,
      records_deleted INTEGER
    );
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDatabaseStats(): {
  liveMetrics: number;
  hourlyMetrics: number;
  dailyMetrics: number;
  containerRecords: number;
  serviceRecords: number;
  notifications: number;
  dbSizeBytes: number;
} {
  const database = getDb();

  const counts = {
    liveMetrics: (database.prepare('SELECT COUNT(*) as c FROM metrics_live').get() as any).c,
    hourlyMetrics: (database.prepare('SELECT COUNT(*) as c FROM metrics_hourly').get() as any).c,
    dailyMetrics: (database.prepare('SELECT COUNT(*) as c FROM metrics_daily').get() as any).c,
    containerRecords: (database.prepare('SELECT COUNT(*) as c FROM container_stats').get() as any).c,
    serviceRecords: (database.prepare('SELECT COUNT(*) as c FROM service_status').get() as any).c,
    notifications: (database.prepare('SELECT COUNT(*) as c FROM notifications').get() as any).c,
    dbSizeBytes: 0,
  };

  try {
    const stats = fs.statSync(DB_FILE);
    counts.dbSizeBytes = stats.size;
  } catch {
    // File might not exist yet
  }

  return counts;
}
