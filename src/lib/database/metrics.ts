/**
 * Metrics Database Operations
 * 
 * CRUD operations for system metrics data.
 */

import { getDb } from './connection';

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
