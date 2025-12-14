/**
 * Aggregation Database Operations
 * 
 * Handles hourly and daily metrics aggregation for historical data.
 */

import { getDb } from './connection';

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
