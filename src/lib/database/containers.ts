/**
 * Container Database Operations
 * 
 * CRUD operations for Docker container statistics.
 */

import { getDb } from './connection';

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
