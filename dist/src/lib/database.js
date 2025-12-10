"use strict";
/**
 * SQLite Database Module for FireFetch Dashboard
 *
 * Handles all database operations for metrics storage, historical data,
 * and real-time data management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.insertMetricsSnapshot = insertMetricsSnapshot;
exports.getLatestMetrics = getLatestMetrics;
exports.getMetricsHistory = getMetricsHistory;
exports.insertContainerStats = insertContainerStats;
exports.getContainerHistory = getContainerHistory;
exports.getLatestContainerStats = getLatestContainerStats;
exports.insertServiceStatus = insertServiceStatus;
exports.getServiceHistory = getServiceHistory;
exports.getLatestServiceStatus = getLatestServiceStatus;
exports.addNotification = addNotification;
exports.getNotifications = getNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.getUnreadCount = getUnreadCount;
exports.aggregateHourlyMetrics = aggregateHourlyMetrics;
exports.aggregateDailyMetrics = aggregateDailyMetrics;
exports.getDatabaseStats = getDatabaseStats;
exports.closeDb = closeDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Database file location - use persistent volume in Docker
const DB_DIR = process.env.DB_PATH || '/app/data';
const DB_FILE = path_1.default.join(DB_DIR, 'dashboard.db');
// Ensure database directory exists
function ensureDbDir() {
    if (!fs_1.default.existsSync(DB_DIR)) {
        fs_1.default.mkdirSync(DB_DIR, { recursive: true });
    }
}
// Singleton database instance
let db = null;
function getDb() {
    if (!db) {
        ensureDbDir();
        db = new better_sqlite3_1.default(DB_FILE);
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = 10000');
        db.pragma('temp_store = MEMORY');
        initializeSchema();
    }
    return db;
}
function initializeSchema() {
    const database = db;
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
function insertMetricsSnapshot(metrics) {
    const database = getDb();
    const stmt = database.prepare(`
    INSERT INTO metrics_live (
      timestamp, cpu_percent, memory_used, memory_total, memory_percent,
      disk_used, disk_total, disk_percent, network_rx, network_tx,
      load_1m, load_5m, load_15m, uptime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(metrics.timestamp, metrics.cpu_percent, metrics.memory_used, metrics.memory_total, metrics.memory_percent, metrics.disk_used, metrics.disk_total, metrics.disk_percent, metrics.network_rx, metrics.network_tx, metrics.load_1m ?? null, metrics.load_5m ?? null, metrics.load_15m ?? null, metrics.uptime ?? null);
}
function getLatestMetrics() {
    const database = getDb();
    const stmt = database.prepare(`
    SELECT * FROM metrics_live ORDER BY timestamp DESC LIMIT 1
  `);
    return stmt.get();
}
function getMetricsHistory(hours = 24, resolution = 'live') {
    const database = getDb();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    let table = 'metrics_live';
    if (resolution === 'hourly')
        table = 'metrics_hourly';
    if (resolution === 'daily')
        table = 'metrics_daily';
    if (resolution === 'live') {
        const stmt = database.prepare(`
      SELECT * FROM ${table} WHERE timestamp >= ? ORDER BY timestamp ASC
    `);
        return stmt.all(cutoff);
    }
    else {
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
        return stmt.all(cutoff);
    }
}
function insertContainerStats(containers) {
    const database = getDb();
    const stmt = database.prepare(`
    INSERT INTO container_stats (
      timestamp, container_id, container_name, cpu_percent,
      memory_used, memory_limit, network_rx, network_tx, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const insertMany = database.transaction((items) => {
        for (const container of items) {
            stmt.run(container.timestamp, container.container_id, container.container_name, container.cpu_percent, container.memory_used, container.memory_limit, container.network_rx ?? null, container.network_tx ?? null, container.status);
        }
    });
    insertMany(containers);
}
function getContainerHistory(containerId, hours = 24) {
    const database = getDb();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const stmt = database.prepare(`
    SELECT * FROM container_stats
    WHERE container_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `);
    return stmt.all(containerId, cutoff);
}
function getLatestContainerStats() {
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
    return stmt.all();
}
function insertServiceStatus(services) {
    const database = getDb();
    const stmt = database.prepare(`
    INSERT INTO service_status (
      timestamp, service_id, service_name, status, response_time, uptime_percent
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
    const insertMany = database.transaction((items) => {
        for (const service of items) {
            stmt.run(service.timestamp, service.service_id, service.service_name, service.status, service.response_time ?? null, service.uptime_percent ?? null);
        }
    });
    insertMany(services);
}
function getServiceHistory(serviceId, hours = 24) {
    const database = getDb();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const stmt = database.prepare(`
    SELECT * FROM service_status
    WHERE service_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
  `);
    return stmt.all(serviceId, cutoff);
}
function getLatestServiceStatus() {
    const database = getDb();
    const stmt = database.prepare(`
    SELECT ss.* FROM service_status ss
    INNER JOIN (
      SELECT service_id, MAX(timestamp) as max_ts
      FROM service_status
      GROUP BY service_id
    ) latest ON ss.service_id = latest.service_id AND ss.timestamp = latest.max_ts
  `);
    return stmt.all();
}
function addNotification(notification) {
    const database = getDb();
    const stmt = database.prepare(`
    INSERT INTO notifications (timestamp, type, title, message, service_id, read)
    VALUES (?, ?, ?, ?, ?, 0)
  `);
    const result = stmt.run(notification.timestamp, notification.type, notification.title, notification.message, notification.service_id ?? null);
    return result.lastInsertRowid;
}
function getNotifications(limit = 50) {
    const database = getDb();
    const stmt = database.prepare(`
    SELECT * FROM notifications ORDER BY timestamp DESC LIMIT ?
  `);
    return stmt.all(limit);
}
function markNotificationRead(id) {
    const database = getDb();
    const stmt = database.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`);
    stmt.run(id);
}
function markAllNotificationsRead() {
    const database = getDb();
    const stmt = database.prepare(`UPDATE notifications SET read = 1`);
    stmt.run();
}
function getUnreadCount() {
    const database = getDb();
    const stmt = database.prepare(`SELECT COUNT(*) as count FROM notifications WHERE read = 0`);
    const result = stmt.get();
    return result.count;
}
// ============================================
// AGGREGATION OPERATIONS
// ============================================
function aggregateHourlyMetrics() {
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
    const hourlyData = stmt.all(oneHourAgo, twentyFourHoursAgo);
    // Insert aggregated data
    const insertStmt = database.prepare(`
    INSERT OR REPLACE INTO metrics_hourly (
      timestamp, cpu_avg, cpu_max, memory_avg, memory_max,
      disk_avg, disk_max, network_rx_total, network_tx_total, sample_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    for (const row of hourlyData) {
        insertStmt.run(row.hour_bucket, row.cpu_avg, row.cpu_max, row.memory_avg, row.memory_max, row.disk_avg, row.disk_max, row.network_rx_total, row.network_tx_total, row.sample_count);
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
function aggregateDailyMetrics() {
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
    const dailyData = stmt.all(oneDayAgo, sevenDaysAgo);
    const insertStmt = database.prepare(`
    INSERT OR REPLACE INTO metrics_daily (
      timestamp, cpu_avg, cpu_max, memory_avg, memory_max,
      disk_avg, disk_max, network_rx_total, network_tx_total, sample_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    for (const row of dailyData) {
        insertStmt.run(row.day_bucket, row.cpu_avg, row.cpu_max, row.memory_avg, row.memory_max, row.disk_avg, row.disk_max, row.network_rx_total, row.network_tx_total, row.sample_count);
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
function getDatabaseStats() {
    const database = getDb();
    const counts = {
        liveMetrics: database.prepare('SELECT COUNT(*) as c FROM metrics_live').get().c,
        hourlyMetrics: database.prepare('SELECT COUNT(*) as c FROM metrics_hourly').get().c,
        dailyMetrics: database.prepare('SELECT COUNT(*) as c FROM metrics_daily').get().c,
        containerRecords: database.prepare('SELECT COUNT(*) as c FROM container_stats').get().c,
        serviceRecords: database.prepare('SELECT COUNT(*) as c FROM service_status').get().c,
        notifications: database.prepare('SELECT COUNT(*) as c FROM notifications').get().c,
        dbSizeBytes: 0,
    };
    try {
        const stats = fs_1.default.statSync(DB_FILE);
        counts.dbSizeBytes = stats.size;
    }
    catch {
        // File might not exist yet
    }
    return counts;
}
function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
