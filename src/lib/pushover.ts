/**
 * Pushover Notification Service for FireFetch Dashboard
 *
 * Sends push notifications via Pushover API for:
 * - Service status changes (offline/online/degraded)
 * - Resource alerts (high CPU, memory, disk)
 * - Incident notifications
 */

export enum PushoverPriority {
  LOWEST = -2,     // No notification/alert
  LOW = -1,        // Quiet hours respected
  NORMAL = 0,      // Normal notification
  HIGH = 1,        // Bypass quiet hours
  EMERGENCY = 2,   // Requires acknowledgement
}

export enum PushoverSound {
  PUSHOVER = 'pushover',
  BIKE = 'bike',
  BUGLE = 'bugle',
  CASHREGISTER = 'cashregister',
  CLASSICAL = 'classical',
  COSMIC = 'cosmic',
  FALLING = 'falling',
  GAMELAN = 'gamelan',
  INCOMING = 'incoming',
  INTERMISSION = 'intermission',
  MAGIC = 'magic',
  MECHANICAL = 'mechanical',
  PIANOBAR = 'pianobar',
  SIREN = 'siren',
  SPACEALARM = 'spacealarm',
  TUGBOAT = 'tugboat',
  ALIEN = 'alien',
  CLIMB = 'climb',
  PERSISTENT = 'persistent',
  ECHO = 'echo',
  UPDOWN = 'updown',
  VIBRATE = 'vibrate',
  NONE = 'none',
}

export interface PushoverNotification {
  title: string;
  message: string;
  priority?: PushoverPriority;
  sound?: PushoverSound;
  url?: string;
  url_title?: string;
  // For emergency priority (2)
  retry?: number;   // Seconds between retries (min 30)
  expire?: number;  // Seconds until notification expires (max 10800)
  // Optional device targeting
  device?: string;
  // Timestamp (Unix epoch)
  timestamp?: number;
  // HTML formatting
  html?: boolean;
}

interface PushoverConfig {
  userKey: string;
  appKey: string;
  enabled: boolean;
}

let config: PushoverConfig = {
  userKey: process.env.PUSHOVER_USER_KEY || '',
  appKey: process.env.PUSHOVER_APP_KEY || '',
  enabled: true,
};

// Track sent notifications to prevent spam
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes between duplicate notifications

/**
 * Initialize Pushover configuration
 */
export function initPushover(userKey?: string, appKey?: string): void {
  if (userKey) config.userKey = userKey;
  if (appKey) config.appKey = appKey;

  if (!config.userKey || !config.appKey) {
    console.warn('[Pushover] Missing credentials - notifications disabled');
    config.enabled = false;
  } else {
    console.log('[Pushover] Initialized with user key:', config.userKey.substring(0, 8) + '...');
    config.enabled = true;
  }
}

/**
 * Enable or disable Pushover notifications
 */
export function setPushoverEnabled(enabled: boolean): void {
  config.enabled = enabled;
  console.log(`[Pushover] Notifications ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Check if Pushover is configured and enabled
 */
export function isPushoverEnabled(): boolean {
  return config.enabled && !!config.userKey && !!config.appKey;
}

/**
 * Send a notification via Pushover
 */
export async function sendPushoverNotification(
  notification: PushoverNotification
): Promise<{ success: boolean; error?: string; request_id?: string }> {
  // Check if enabled
  if (!config.enabled) {
    return { success: false, error: 'Pushover notifications are disabled' };
  }

  // Check credentials
  if (!config.userKey || !config.appKey) {
    return { success: false, error: 'Pushover credentials not configured' };
  }

  // Create unique key for deduplication
  const notificationKey = `${notification.title}:${notification.message}`;
  const lastSent = recentNotifications.get(notificationKey);
  const now = Date.now();

  // Prevent duplicate notifications within cooldown period
  if (lastSent && now - lastSent < NOTIFICATION_COOLDOWN) {
    console.log(`[Pushover] Skipping duplicate notification: ${notification.title}`);
    return { success: true, error: 'Duplicate notification skipped (cooldown)' };
  }

  try {
    const body: Record<string, string | number> = {
      token: config.appKey,
      user: config.userKey,
      title: notification.title,
      message: notification.message,
    };

    // Add optional parameters
    if (notification.priority !== undefined) {
      body.priority = notification.priority;
    }
    if (notification.sound) {
      body.sound = notification.sound;
    }
    if (notification.url) {
      body.url = notification.url;
    }
    if (notification.url_title) {
      body.url_title = notification.url_title;
    }
    if (notification.device) {
      body.device = notification.device;
    }
    if (notification.timestamp) {
      body.timestamp = notification.timestamp;
    }
    if (notification.html) {
      body.html = 1;
    }

    // Emergency priority requires retry and expire
    if (notification.priority === PushoverPriority.EMERGENCY) {
      body.retry = notification.retry || 60;
      body.expire = notification.expire || 3600;
    }

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body as Record<string, string>).toString(),
    });

    const result = await response.json();

    if (response.ok && result.status === 1) {
      // Track successful notification
      recentNotifications.set(notificationKey, now);

      // Cleanup old entries
      Array.from(recentNotifications.entries()).forEach(([key, timestamp]) => {
        if (now - timestamp > NOTIFICATION_COOLDOWN * 2) {
          recentNotifications.delete(key);
        }
      });

      console.log(`[Pushover] Notification sent: ${notification.title}`);
      return { success: true, request_id: result.request };
    } else {
      console.error('[Pushover] Failed to send notification:', result);
      return {
        success: false,
        error: result.errors?.join(', ') || 'Unknown error',
      };
    }
  } catch (error) {
    console.error('[Pushover] Error sending notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  return sendPushoverNotification({
    title: 'FireFetch Dashboard Test',
    message: 'This is a test notification from FireFetch Dashboard. If you receive this, notifications are working correctly.',
    priority: PushoverPriority.NORMAL,
    sound: PushoverSound.PUSHOVER,
  });
}

// Convenience functions for common notification types

export async function notifyServiceOffline(serviceName: string, serviceUrl?: string): Promise<void> {
  await sendPushoverNotification({
    title: `Service Offline: ${serviceName}`,
    message: `${serviceName} is now offline and may require attention.`,
    priority: PushoverPriority.HIGH,
    sound: PushoverSound.SIREN,
    url: serviceUrl,
    url_title: 'View Service',
  });
}

export async function notifyServiceOnline(serviceName: string): Promise<void> {
  await sendPushoverNotification({
    title: `Service Recovered: ${serviceName}`,
    message: `${serviceName} is back online.`,
    priority: PushoverPriority.NORMAL,
    sound: PushoverSound.MAGIC,
  });
}

export async function notifyHighResource(
  resource: 'CPU' | 'Memory' | 'Disk',
  percentage: number
): Promise<void> {
  const isEmergency = percentage >= 95;

  await sendPushoverNotification({
    title: `High ${resource} Usage`,
    message: `${resource} usage is at ${percentage.toFixed(1)}%${isEmergency ? ' - CRITICAL!' : ''}`,
    priority: isEmergency ? PushoverPriority.EMERGENCY : PushoverPriority.HIGH,
    sound: isEmergency ? PushoverSound.SIREN : PushoverSound.SPACEALARM,
    retry: isEmergency ? 60 : undefined,
    expire: isEmergency ? 3600 : undefined,
  });
}

export async function notifyIncident(
  title: string,
  description: string,
  severity: 'info' | 'warning' | 'critical'
): Promise<void> {
  const priority =
    severity === 'critical'
      ? PushoverPriority.EMERGENCY
      : severity === 'warning'
      ? PushoverPriority.HIGH
      : PushoverPriority.NORMAL;

  const sound =
    severity === 'critical'
      ? PushoverSound.SIREN
      : severity === 'warning'
      ? PushoverSound.SPACEALARM
      : PushoverSound.PUSHOVER;

  await sendPushoverNotification({
    title: `Incident: ${title}`,
    message: description,
    priority,
    sound,
    retry: severity === 'critical' ? 60 : undefined,
    expire: severity === 'critical' ? 3600 : undefined,
  });
}

// Initialize on module load
initPushover();
