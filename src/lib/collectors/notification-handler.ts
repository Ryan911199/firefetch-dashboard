/**
 * Notification Handler
 * 
 * Handles resource alerts and threshold-based notifications.
 */

import {
  type MetricsSnapshot,
  addNotification,
  getLatestMetrics,
} from '../database';
import { sendPushoverNotification, PushoverPriority } from '../pushover';

/**
 * Check for resource alerts based on current metrics
 */
export async function checkResourceAlerts(metrics: MetricsSnapshot): Promise<void> {
  const previous = getLatestMetrics();

  // CPU alert
  if (metrics.cpu_percent > 90 && (!previous || previous.cpu_percent <= 90)) {
    const notification = {
      timestamp: Date.now(),
      type: 'warning' as const,
      title: 'High CPU Usage',
      message: `CPU usage is at ${metrics.cpu_percent.toFixed(1)}%`,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: notification.title,
      message: notification.message,
      priority: PushoverPriority.HIGH,
    });
  }

  // Memory alert
  if (metrics.memory_percent > 90 && (!previous || previous.memory_percent <= 90)) {
    const notification = {
      timestamp: Date.now(),
      type: 'warning' as const,
      title: 'High Memory Usage',
      message: `Memory usage is at ${metrics.memory_percent.toFixed(1)}%`,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: notification.title,
      message: notification.message,
      priority: PushoverPriority.HIGH,
    });
  }

  // Disk alert (more critical)
  if (metrics.disk_percent > 90 && (!previous || previous.disk_percent <= 90)) {
    const notification = {
      timestamp: Date.now(),
      type: 'error' as const,
      title: 'Low Disk Space',
      message: `Disk usage is at ${metrics.disk_percent.toFixed(1)}%`,
    };
    addNotification(notification);
    await sendPushoverNotification({
      title: notification.title,
      message: notification.message,
      priority: PushoverPriority.EMERGENCY,
      retry: 60,
      expire: 3600,
    });
  }
}
