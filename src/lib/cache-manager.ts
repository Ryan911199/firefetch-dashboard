import fs from "fs";
import path from "path";

// Cache file paths
const CACHE_DIR = "/tmp/dashboard-cache";
const METRICS_CACHE_FILE = path.join(CACHE_DIR, "metrics.json");
const METRICS_HISTORY_FILE = path.join(CACHE_DIR, "metrics-history.json");
const SERVICES_CACHE_FILE = path.join(CACHE_DIR, "services.json");
const CONTAINERS_CACHE_FILE = path.join(CACHE_DIR, "containers.json");
const NOTIFICATIONS_FILE = path.join(CACHE_DIR, "notifications.json");

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Generic read/write functions
function readCache<T>(filePath: string, defaultValue: T): T {
  try {
    ensureCacheDir();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Failed to read cache ${filePath}:`, error);
  }
  return defaultValue;
}

function writeCache<T>(filePath: string, data: T): void {
  try {
    ensureCacheDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to write cache ${filePath}:`, error);
  }
}

// Types
export interface CachedData<T> {
  data: T;
  timestamp: number;
  stale?: boolean;
}

export interface MetricsHistoryPoint {
  timestamp: number;
  cpu: number;
  memoryPercent: number;
  diskPercent: number;
  networkUp: number;
  networkDown: number;
}

export interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  serviceId?: string;
}

// Metrics cache
export function getMetricsCache(): CachedData<any> | null {
  const cache = readCache<CachedData<any> | null>(METRICS_CACHE_FILE, null);
  if (cache && Date.now() - cache.timestamp < 60000) {
    return cache;
  }
  return cache ? { ...cache, stale: true } : null;
}

export function setMetricsCache(data: any): void {
  writeCache(METRICS_CACHE_FILE, {
    data,
    timestamp: Date.now(),
  });
}

// Services cache
export function getServicesCache(): CachedData<any> | null {
  const cache = readCache<CachedData<any> | null>(SERVICES_CACHE_FILE, null);
  if (cache && Date.now() - cache.timestamp < 30000) {
    return cache;
  }
  return cache ? { ...cache, stale: true } : null;
}

export function setServicesCache(data: any): void {
  writeCache(SERVICES_CACHE_FILE, {
    data,
    timestamp: Date.now(),
  });
}

// Containers cache
export function getContainersCache(): CachedData<any> | null {
  const cache = readCache<CachedData<any> | null>(CONTAINERS_CACHE_FILE, null);
  if (cache && Date.now() - cache.timestamp < 30000) {
    return cache;
  }
  return cache ? { ...cache, stale: true } : null;
}

export function setContainersCache(data: any): void {
  writeCache(CONTAINERS_CACHE_FILE, {
    data,
    timestamp: Date.now(),
  });
}

// Metrics History - stores last 24 hours of data points (every 5 minutes = 288 points)
const MAX_HISTORY_POINTS = 288;

export function getMetricsHistory(): MetricsHistoryPoint[] {
  return readCache<MetricsHistoryPoint[]>(METRICS_HISTORY_FILE, []);
}

export function addMetricsHistoryPoint(point: Omit<MetricsHistoryPoint, "timestamp">): void {
  const history = getMetricsHistory();
  const newPoint: MetricsHistoryPoint = {
    ...point,
    timestamp: Date.now(),
  };

  history.push(newPoint);

  // Keep only the last MAX_HISTORY_POINTS
  while (history.length > MAX_HISTORY_POINTS) {
    history.shift();
  }

  writeCache(METRICS_HISTORY_FILE, history);
}

// Check if we should add a new history point (every 5 minutes)
export function shouldAddHistoryPoint(): boolean {
  const history = getMetricsHistory();
  if (history.length === 0) return true;

  const lastPoint = history[history.length - 1];
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - lastPoint.timestamp >= fiveMinutes;
}

// Notifications
export function getNotifications(): Notification[] {
  return readCache<Notification[]>(NOTIFICATIONS_FILE, []);
}

export function addNotification(notification: Omit<Notification, "id" | "timestamp" | "read">): void {
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read: false,
  };

  notifications.unshift(newNotification);

  // Keep only last 50 notifications
  while (notifications.length > 50) {
    notifications.pop();
  }

  writeCache(NOTIFICATIONS_FILE, notifications);
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const notification = notifications.find((n) => n.id === id);
  if (notification) {
    notification.read = true;
    writeCache(NOTIFICATIONS_FILE, notifications);
  }
}

export function markAllNotificationsRead(): void {
  const notifications = getNotifications();
  notifications.forEach((n) => (n.read = true));
  writeCache(NOTIFICATIONS_FILE, notifications);
}

export function clearNotifications(): void {
  writeCache(NOTIFICATIONS_FILE, []);
}

// Service status change detection
let previousServiceStatuses: Record<string, string> = {};

export function checkServiceStatusChanges(services: Array<{ id: string; name: string; status: string }>): void {
  for (const service of services) {
    const prevStatus = previousServiceStatuses[service.id];

    if (prevStatus && prevStatus !== service.status) {
      // Status changed
      if (service.status === "offline") {
        addNotification({
          type: "error",
          title: "Service Offline",
          message: `${service.name} is now offline`,
          serviceId: service.id,
        });
      } else if (service.status === "online" && prevStatus === "offline") {
        addNotification({
          type: "success",
          title: "Service Recovered",
          message: `${service.name} is back online`,
          serviceId: service.id,
        });
      } else if (service.status === "degraded") {
        addNotification({
          type: "warning",
          title: "Service Degraded",
          message: `${service.name} is experiencing issues`,
          serviceId: service.id,
        });
      }
    }

    previousServiceStatuses[service.id] = service.status;
  }
}

// High resource usage alerts
export function checkResourceAlerts(metrics: {
  cpu: number;
  memory: { percent: number };
  disk: { percent: number };
}): void {
  const history = getMetricsHistory();
  const lastPoint = history[history.length - 1];

  // Only alert once per threshold crossing (check if previous was below threshold)
  if (metrics.cpu > 90 && (!lastPoint || lastPoint.cpu <= 90)) {
    addNotification({
      type: "warning",
      title: "High CPU Usage",
      message: `CPU usage is at ${metrics.cpu.toFixed(1)}%`,
    });
  }

  if (metrics.memory.percent > 90 && (!lastPoint || lastPoint.memoryPercent <= 90)) {
    addNotification({
      type: "warning",
      title: "High Memory Usage",
      message: `Memory usage is at ${metrics.memory.percent.toFixed(1)}%`,
    });
  }

  if (metrics.disk.percent > 90 && (!lastPoint || lastPoint.diskPercent <= 90)) {
    addNotification({
      type: "error",
      title: "Low Disk Space",
      message: `Disk usage is at ${metrics.disk.percent.toFixed(1)}%`,
    });
  }
}
