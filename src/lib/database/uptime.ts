/**
 * Uptime Database Operations
 * 
 * Calculates and retrieves service uptime statistics.
 */

import { getDb } from './connection';

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

export interface UptimeHistoryEntry {
  timestamp: number;
  status: string;
  response_time: number | null;
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
