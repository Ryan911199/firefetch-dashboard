/**
 * SQLite Database Module for FireFetch Dashboard
 *
 * Handles all database operations for metrics storage, historical data,
 * and real-time data management.
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

// ============================================
// METRICS OPERATIONS
// ============================================

export interface MetricsSnapshot {
  timestamp: number;
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  network_rx: number;
  network_tx: number;
  load_1m?: number;
  load_5m?: number;
  load_15m?: number;
  uptime?: number;
}

export function insertMetricsSnapshot(metrics: MetricsSnapshot): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO metrics_live (
      timestamp, cpu_percent, memory_used, memory_total, memory_percent,
      disk_used, disk_total, disk_percent, network_rx, network_tx,
      load_1m, load_5m, load_15m, uptime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    metrics.timestamp,
    metrics.cpu_percent,
    metrics.memory_used,
    metrics.memory_total,
    metrics.memory_percent,
    metrics.disk_used,
    metrics.disk_total,
    metrics.disk_percent,
    metrics.network_rx,
    metrics.network_tx,
    metrics.load_1m ?? null,
    metrics.load_5m ?? null,
    metrics.load_15m ?? null,
    metrics.uptime ?? null
  );
}

export function getLatestMetrics(): MetricsSnapshot | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM metrics_live ORDER BY timestamp DESC LIMIT 1
  `);
  return stmt.get() as MetricsSnapshot | null;
}

export function getMetricsHistory(
  hours: number = 24,
  resolution: 'live' | 'hourly' | 'daily' = 'live'
): MetricsSnapshot[] {
  const database = getDb();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  let table = 'metrics_live';
  if (resolution === 'hourly') table = 'metrics_hourly';
  if (resolution === 'daily') table = 'metrics_daily';

  if (resolution === 'live') {
    const stmt = database.prepare(`
      SELECT * FROM ${table} WHERE timestamp >= ? ORDER BY timestamp ASC
    `);
    return stmt.all(cutoff) as MetricsSnapshot[];
  } else {
    // For aggregated data, return different column structure
    const stmt = database.prepare(`
      SELECT
        timestamp,
        cpu_avg as cpu_percent,
        memory_avg as memory_percent,
        disk_avg as disk_percent,
        network_rx_total as network_rx,
        network_tx_total as network_tx
      FROM ${table} WHERE timestamp >= ? ORDER BY timestamp ASC
    `);
    return stmt.all(cutoff) as MetricsSnapshot[];
  }
}

// ============================================
// CONTAINER OPERATIONS
// ============================================

export interface ContainerSnapshot {
  timestamp: number;
  container_id: string;
  container_name: string;
  cpu_percent: number;
  memory_used: number;
  memory_limit: number;
  network_rx?: number;
  network_tx?: number;
  status: string;
}

export function insertContainerStats(containers: ContainerSnapshot[]): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO container_stats (
      timestamp, container_id, container_name, cpu_percent,
      memory_used, memory_limit, network_rx, network_tx, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((items: ContainerSnapshot[]) => {
    for (const container of items) {
      stmt.run(
        container.timestamp,
        container.container_id,
        container.container_name,
        container.cpu_percent,
        container.memory_used,
        container.memory_limit,
        container.network_rx ?? null,
        container.network_tx ?? null,
        container.status
      );
    }
  });

  insertMany(containers);
}

export function getContainerHistory(
  containerId: string,
  hours: number = 24
): ContainerSnapshot[] {
  const database = getDb();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  const stmt = database.prepare(`
    SELECT * FROM container_stats
    WHERE container_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `);

  return stmt.all(containerId, cutoff) as ContainerSnapshot[];
}

export function getLatestContainerStats(): ContainerSnapshot[] {
  const database = getDb();

  // Get the most recent stats for each container
  const stmt = database.prepare(`
    SELECT cs.* FROM container_stats cs
    INNER JOIN (
      SELECT container_id, MAX(timestamp) as max_ts
      FROM container_stats
      GROUP BY container_id
    ) latest ON cs.container_id = latest.container_id AND cs.timestamp = latest.max_ts
  `);

  return stmt.all() as ContainerSnapshot[];
}

// ============================================
// SERVICE STATUS OPERATIONS
// ============================================

export interface ServiceSnapshot {
  timestamp: number;
  service_id: string;
  service_name: string;
  status: string;
  response_time?: number;
  uptime_percent?: number;
}

export function insertServiceStatus(services: ServiceSnapshot[]): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO service_status (
      timestamp, service_id, service_name, status, response_time, uptime_percent
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((items: ServiceSnapshot[]) => {
    for (const service of items) {
      stmt.run(
        service.timestamp,
        service.service_id,
        service.service_name,
        service.status,
        service.response_time ?? null,
        service.uptime_percent ?? null
      );
    }
  });

  insertMany(services);
}

export function getServiceHistory(
  serviceId: string,
  hours: number = 24
): ServiceSnapshot[] {
  const database = getDb();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  const stmt = database.prepare(`
    SELECT * FROM service_status
    WHERE service_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `);

  return stmt.all(serviceId, cutoff) as ServiceSnapshot[];
}

export function getLatestServiceStatus(): ServiceSnapshot[] {
  const database = getDb();

  const stmt = database.prepare(`
    SELECT ss.* FROM service_status ss
    INNER JOIN (
      SELECT service_id, MAX(timestamp) as max_ts
      FROM service_status
      GROUP BY service_id
    ) latest ON ss.service_id = latest.service_id AND ss.timestamp = latest.max_ts
  `);

  return stmt.all() as ServiceSnapshot[];
}

// ============================================
// NOTIFICATION OPERATIONS
// ============================================

export interface Notification {
  id?: number;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  service_id?: string;
  read: boolean;
}

export function addNotification(notification: Omit<Notification, 'id' | 'read'>): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO notifications (timestamp, type, title, message, service_id, read)
    VALUES (?, ?, ?, ?, ?, 0)
  `);

  const result = stmt.run(
    notification.timestamp,
    notification.type,
    notification.title,
    notification.message,
    notification.service_id ?? null
  );

  return result.lastInsertRowid as number;
}

export function getNotifications(limit: number = 50): Notification[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?
  `);

  return stmt.all(limit) as Notification[];
}

export function markNotificationRead(id: number): void {
  const database = getDb();
  const stmt = database.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`);
  stmt.run(id);
}

export function markAllNotificationsRead(): void {
  const database = getDb();
  const stmt = database.prepare(`UPDATE notifications SET read = 1`);
  stmt.run();
}

export function getUnreadCount(): number {
  const database = getDb();
  const stmt = database.prepare(`SELECT COUNT(*) as count FROM notifications WHERE read = 0`);
  const result = stmt.get() as { count: number };
  return result.count;
}

// ============================================
// AGGREGATION OPERATIONS
// ============================================

export function aggregateHourlyMetrics(): { processed: number; deleted: number } {
  const database = getDb();
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

  // Get data older than 1 hour but not already aggregated
  const stmt = database.prepare(`
    SELECT
      (timestamp / 3600000) * 3600000 as hour_bucket,
      AVG(cpu_percent) as cpu_avg,
      MAX(cpu_percent) as cpu_max,
      AVG(memory_percent) as memory_avg,
      MAX(memory_percent) as memory_max,
      AVG(disk_percent) as disk_avg,
      MAX(disk_percent) as disk_max,
      SUM(network_rx) as network_rx_total,
      SUM(network_tx) as network_tx_total,
      COUNT(*) as sample_count
    FROM metrics_live
    WHERE timestamp < ? AND timestamp >= ?
    GROUP BY hour_bucket
  `);

  const hourlyData = stmt.all(oneHourAgo, twentyFourHoursAgo) as any[];

  // Insert aggregated data
  const insertStmt = database.prepare(`
    INSERT OR REPLACE INTO metrics_hourly (
      timestamp, cpu_avg, cpu_max, memory_avg, memory_max,
      disk_avg, disk_max, network_rx_total, network_tx_total, sample_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of hourlyData) {
    insertStmt.run(
      row.hour_bucket,
      row.cpu_avg,
      row.cpu_max,
      row.memory_avg,
      row.memory_max,
      row.disk_avg,
      row.disk_max,
      row.network_rx_total,
      row.network_tx_total,
      row.sample_count
    );
  }

  // Delete old live data (keep last 24 hours)
  const deleteStmt = database.prepare(`DELETE FROM metrics_live WHERE timestamp < ?`);
  const deleteResult = deleteStmt.run(twentyFourHoursAgo);

  // Log aggregation
  const logStmt = database.prepare(`
    INSERT INTO aggregation_log (aggregation_type, last_run, records_processed, records_deleted)
    VALUES ('hourly', ?, ?, ?)
  `);
  logStmt.run(Date.now(), hourlyData.length, deleteResult.changes);

  return { processed: hourlyData.length, deleted: deleteResult.changes };
}

export function aggregateDailyMetrics(): { processed: number; deleted: number } {
  const database = getDb();
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  // Aggregate hourly data into daily
  const stmt = database.prepare(`
    SELECT
      (timestamp / 86400000) * 86400000 as day_bucket,
      AVG(cpu_avg) as cpu_avg,
      MAX(cpu_max) as cpu_max,
      AVG(memory_avg) as memory_avg,
      MAX(memory_max) as memory_max,
      AVG(disk_avg) as disk_avg,
      MAX(disk_max) as disk_max,
      SUM(network_rx_total) as network_rx_total,
      SUM(network_tx_total) as network_tx_total,
      SUM(sample_count) as sample_count
    FROM metrics_hourly
    WHERE timestamp < ? AND timestamp >= ?
    GROUP BY day_bucket
  `);

  const dailyData = stmt.all(oneDayAgo, sevenDaysAgo) as any[];

  const insertStmt = database.prepare(`
    INSERT OR REPLACE INTO metrics_daily (
      timestamp, cpu_avg, cpu_max, memory_avg, memory_max,
      disk_avg, disk_max, network_rx_total, network_tx_total, sample_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of dailyData) {
    insertStmt.run(
      row.day_bucket,
      row.cpu_avg,
      row.cpu_max,
      row.memory_avg,
      row.memory_max,
      row.disk_avg,
      row.disk_max,
      row.network_rx_total,
      row.network_tx_total,
      row.sample_count
    );
  }

  // Delete old hourly data (keep last 7 days)
  const deleteStmt = database.prepare(`DELETE FROM metrics_hourly WHERE timestamp < ?`);
  const deleteResult = deleteStmt.run(sevenDaysAgo);

  // Delete old daily data (keep last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const deleteDailyStmt = database.prepare(`DELETE FROM metrics_daily WHERE timestamp < ?`);
  deleteDailyStmt.run(thirtyDaysAgo);

  // Clean up old container and service stats (keep 7 days)
  const cleanContainerStmt = database.prepare(`DELETE FROM container_stats WHERE timestamp < ?`);
  cleanContainerStmt.run(sevenDaysAgo);

  const cleanServiceStmt = database.prepare(`DELETE FROM service_status WHERE timestamp < ?`);
  cleanServiceStmt.run(sevenDaysAgo);

  // Clean old notifications (keep 30 days)
  const cleanNotifStmt = database.prepare(`DELETE FROM notifications WHERE timestamp < ?`);
  cleanNotifStmt.run(thirtyDaysAgo);

  // Log aggregation
  const logStmt = database.prepare(`
    INSERT INTO aggregation_log (aggregation_type, last_run, records_processed, records_deleted)
    VALUES ('daily', ?, ?, ?)
  `);
  logStmt.run(Date.now(), dailyData.length, deleteResult.changes);

  return { processed: dailyData.length, deleted: deleteResult.changes };
}

// ============================================
// DATABASE INFO
// ============================================

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

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================
// UPTIME CALCULATIONS
// ============================================

export interface ServiceUptime {
  service_id: string;
  service_name: string;
  current_status: string;
  uptime_24h: number;
  uptime_7d: number;
  uptime_30d: number;
  uptime_90d: number;
  avg_response_time: number | null;
  total_checks: number;
  last_checked: number;
}

export function getServiceUptime(serviceId: string): ServiceUptime | null {
  const database = getDb();

  // Get latest status
  const latestStmt = database.prepare(`
    SELECT service_name, status, response_time, timestamp
    FROM service_status
    WHERE service_id = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  const latest = latestStmt.get(serviceId) as any;

  if (!latest) return null;

  // Calculate uptimes for different periods
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

  const uptimeQuery = database.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
      AVG(CASE WHEN response_time IS NOT NULL THEN response_time END) as avg_response
    FROM service_status
    WHERE service_id = ? AND timestamp >= ?
  `);

  const uptime24h = uptimeQuery.get(serviceId, twentyFourHoursAgo) as any;
  const uptime7d = uptimeQuery.get(serviceId, sevenDaysAgo) as any;
  const uptime30d = uptimeQuery.get(serviceId, thirtyDaysAgo) as any;
  const uptime90d = uptimeQuery.get(serviceId, ninetyDaysAgo) as any;

  return {
    service_id: serviceId,
    service_name: latest.service_name,
    current_status: latest.status,
    uptime_24h: uptime24h.total > 0 ? (uptime24h.online / uptime24h.total) * 100 : 100,
    uptime_7d: uptime7d.total > 0 ? (uptime7d.online / uptime7d.total) * 100 : 100,
    uptime_30d: uptime30d.total > 0 ? (uptime30d.online / uptime30d.total) * 100 : 100,
    uptime_90d: uptime90d.total > 0 ? (uptime90d.online / uptime90d.total) * 100 : 100,
    avg_response_time: uptime24h.avg_response,
    total_checks: uptime90d.total,
    last_checked: latest.timestamp,
  };
}

export function getAllServiceUptimes(): ServiceUptime[] {
  const database = getDb();

  // Optimized single-query approach to avoid N+1 problem
  // This replaces the previous approach of calling getServiceUptime() in a loop
  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

  // Single aggregated query that gets all uptime data at once
  const stmt = database.prepare(`
    WITH latest_status AS (
      SELECT
        service_id,
        service_name,
        status,
        response_time,
        timestamp,
        ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY timestamp DESC) as rn
      FROM service_status
    ),
    uptime_24h AS (
      SELECT
        service_id,
        COUNT(*) as total_24h,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_24h,
        AVG(CASE WHEN response_time IS NOT NULL THEN response_time END) as avg_response_24h
      FROM service_status
      WHERE timestamp >= ?
      GROUP BY service_id
    ),
    uptime_7d AS (
      SELECT
        service_id,
        COUNT(*) as total_7d,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_7d
      FROM service_status
      WHERE timestamp >= ?
      GROUP BY service_id
    ),
    uptime_30d AS (
      SELECT
        service_id,
        COUNT(*) as total_30d,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_30d
      FROM service_status
      WHERE timestamp >= ?
      GROUP BY service_id
    ),
    uptime_90d AS (
      SELECT
        service_id,
        COUNT(*) as total_90d,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_90d
      FROM service_status
      WHERE timestamp >= ?
      GROUP BY service_id
    )
    SELECT
      ls.service_id,
      ls.service_name,
      ls.status as current_status,
      CASE WHEN u24.total_24h > 0 THEN (u24.online_24h * 100.0 / u24.total_24h) ELSE 100 END as uptime_24h,
      CASE WHEN u7.total_7d > 0 THEN (u7.online_7d * 100.0 / u7.total_7d) ELSE 100 END as uptime_7d,
      CASE WHEN u30.total_30d > 0 THEN (u30.online_30d * 100.0 / u30.total_30d) ELSE 100 END as uptime_30d,
      CASE WHEN u90.total_90d > 0 THEN (u90.online_90d * 100.0 / u90.total_90d) ELSE 100 END as uptime_90d,
      u24.avg_response_24h as avg_response_time,
      COALESCE(u90.total_90d, 0) as total_checks,
      ls.timestamp as last_checked
    FROM latest_status ls
    LEFT JOIN uptime_24h u24 ON ls.service_id = u24.service_id
    LEFT JOIN uptime_7d u7 ON ls.service_id = u7.service_id
    LEFT JOIN uptime_30d u30 ON ls.service_id = u30.service_id
    LEFT JOIN uptime_90d u90 ON ls.service_id = u90.service_id
    WHERE ls.rn = 1
    ORDER BY ls.service_id
  `);

  return stmt.all(twentyFourHoursAgo, sevenDaysAgo, thirtyDaysAgo, ninetyDaysAgo) as ServiceUptime[];
}

export interface UptimeHistoryEntry {
  timestamp: number;
  status: string;
  response_time: number | null;
}

export function getServiceUptimeHistory(
  serviceId: string,
  hours: number = 24
): UptimeHistoryEntry[] {
  const database = getDb();
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);

  const stmt = database.prepare(`
    SELECT timestamp, status, response_time
    FROM service_status
    WHERE service_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `);

  return stmt.all(serviceId, cutoff) as UptimeHistoryEntry[];
}

// ============================================
// INCIDENTS
// ============================================

export interface Incident {
  id?: number;
  timestamp: number;
  resolved_at: number | null;
  service_id: string;
  service_name: string;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
}

// Create incidents table if not exists
export function ensureIncidentsTable(): void {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      resolved_at INTEGER,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL DEFAULT 'minor',
      status TEXT NOT NULL DEFAULT 'investigating'
    );
    CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_id);
  `);
}

export function createIncident(incident: Omit<Incident, 'id'>): number {
  ensureIncidentsTable();
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO incidents (
      timestamp, resolved_at, service_id, service_name, title, description, severity, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    incident.timestamp,
    incident.resolved_at,
    incident.service_id,
    incident.service_name,
    incident.title,
    incident.description || '',
    incident.severity,
    incident.status
  );

  return result.lastInsertRowid as number;
}

export function updateIncident(id: number, updates: Partial<Incident>): void {
  ensureIncidentsTable();
  const database = getDb();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.resolved_at !== undefined) {
    fields.push('resolved_at = ?');
    values.push(updates.resolved_at);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.severity !== undefined) {
    fields.push('severity = ?');
    values.push(updates.severity);
  }
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }

  if (fields.length === 0) return;

  values.push(id);
  const stmt = database.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function getActiveIncidents(): Incident[] {
  ensureIncidentsTable();
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM incidents
    WHERE status != 'resolved'
    ORDER BY timestamp DESC
  `);
  return stmt.all() as Incident[];
}

export function getRecentIncidents(limit: number = 10): Incident[] {
  ensureIncidentsTable();
  const database = getDb();
  const stmt = database.prepare(`
    SELECT * FROM incidents
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(limit) as Incident[];
}

export function resolveIncident(id: number): void {
  updateIncident(id, {
    status: 'resolved',
    resolved_at: Date.now(),
  });
}

// ============================================
// DATABASE CLEANUP
// ============================================

/**
 * Remove service data for decommissioned services
 */
export function removeServiceData(serviceIds: string[]): { deleted: number } {
  const database = getDb();
  let totalDeleted = 0;

  for (const serviceId of serviceIds) {
    // Delete from service_status
    const stmt1 = database.prepare('DELETE FROM service_status WHERE service_id = ?');
    const result1 = stmt1.run(serviceId);
    totalDeleted += result1.changes;

    // Delete from notifications
    const stmt2 = database.prepare('DELETE FROM notifications WHERE service_id = ?');
    const result2 = stmt2.run(serviceId);
    totalDeleted += result2.changes;

    // Delete from incidents
    ensureIncidentsTable();
    const stmt3 = database.prepare('DELETE FROM incidents WHERE service_id = ?');
    const result3 = stmt3.run(serviceId);
    totalDeleted += result3.changes;

    console.log(`[Database] Removed data for service: ${serviceId}`);
  }

  return { deleted: totalDeleted };
}

/**
 * Get list of service IDs in the database
 */
export function getTrackedServiceIds(): string[] {
  const database = getDb();
  const stmt = database.prepare('SELECT DISTINCT service_id FROM service_status');
  const results = stmt.all() as { service_id: string }[];
  return results.map(r => r.service_id);
}
