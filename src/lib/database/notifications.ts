/**
 * Notifications Database Operations
 * 
 * CRUD operations for system notifications and alerts.
 */

import { getDb } from './connection';

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
