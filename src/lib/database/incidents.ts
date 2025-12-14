/**
 * Incidents Database Operations
 * 
 * Manages service incidents and their lifecycle.
 */

import { getDb } from './connection';

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
