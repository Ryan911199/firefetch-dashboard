/**
 * Service Database Operations
 * 
 * CRUD operations for service status tracking.
 */

import { getDb } from './connection';

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

/**
 * Get list of service IDs in the database
 */
export function getTrackedServiceIds(): string[] {
  const database = getDb();
  const stmt = database.prepare('SELECT DISTINCT service_id FROM service_status');
  const results = stmt.all() as { service_id: string }[];
  return results.map(r => r.service_id);
}

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

    // Delete from incidents (table is created in incidents module)
    try {
      const stmt3 = database.prepare('DELETE FROM incidents WHERE service_id = ?');
      const result3 = stmt3.run(serviceId);
      totalDeleted += result3.changes;
    } catch {
      // Incidents table might not exist yet
    }

    console.log(`[Database] Removed data for service: ${serviceId}`);
  }

  return { deleted: totalDeleted };
}
