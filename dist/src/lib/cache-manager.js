"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetricsCache = getMetricsCache;
exports.setMetricsCache = setMetricsCache;
exports.getServicesCache = getServicesCache;
exports.setServicesCache = setServicesCache;
exports.getContainersCache = getContainersCache;
exports.setContainersCache = setContainersCache;
exports.getMetricsHistory = getMetricsHistory;
exports.addMetricsHistoryPoint = addMetricsHistoryPoint;
exports.shouldAddHistoryPoint = shouldAddHistoryPoint;
exports.getNotifications = getNotifications;
exports.addNotification = addNotification;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.clearNotifications = clearNotifications;
exports.checkServiceStatusChanges = checkServiceStatusChanges;
exports.checkResourceAlerts = checkResourceAlerts;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Cache file paths
const CACHE_DIR = "/tmp/dashboard-cache";
const METRICS_CACHE_FILE = path_1.default.join(CACHE_DIR, "metrics.json");
const METRICS_HISTORY_FILE = path_1.default.join(CACHE_DIR, "metrics-history.json");
const SERVICES_CACHE_FILE = path_1.default.join(CACHE_DIR, "services.json");
const CONTAINERS_CACHE_FILE = path_1.default.join(CACHE_DIR, "containers.json");
const NOTIFICATIONS_FILE = path_1.default.join(CACHE_DIR, "notifications.json");
// Ensure cache directory exists
function ensureCacheDir() {
    if (!fs_1.default.existsSync(CACHE_DIR)) {
        fs_1.default.mkdirSync(CACHE_DIR, { recursive: true });
    }
}
// Generic read/write functions
function readCache(filePath, defaultValue) {
    try {
        ensureCacheDir();
        if (fs_1.default.existsSync(filePath)) {
            const data = fs_1.default.readFileSync(filePath, "utf-8");
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error(`Failed to read cache ${filePath}:`, error);
    }
    return defaultValue;
}
function writeCache(filePath, data) {
    try {
        ensureCacheDir();
        fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    catch (error) {
        console.error(`Failed to write cache ${filePath}:`, error);
    }
}
// Metrics cache
function getMetricsCache() {
    const cache = readCache(METRICS_CACHE_FILE, null);
    if (cache && Date.now() - cache.timestamp < 60000) {
        return cache;
    }
    return cache ? { ...cache, stale: true } : null;
}
function setMetricsCache(data) {
    writeCache(METRICS_CACHE_FILE, {
        data,
        timestamp: Date.now(),
    });
}
// Services cache
function getServicesCache() {
    const cache = readCache(SERVICES_CACHE_FILE, null);
    if (cache && Date.now() - cache.timestamp < 30000) {
        return cache;
    }
    return cache ? { ...cache, stale: true } : null;
}
function setServicesCache(data) {
    writeCache(SERVICES_CACHE_FILE, {
        data,
        timestamp: Date.now(),
    });
}
// Containers cache
function getContainersCache() {
    const cache = readCache(CONTAINERS_CACHE_FILE, null);
    if (cache && Date.now() - cache.timestamp < 30000) {
        return cache;
    }
    return cache ? { ...cache, stale: true } : null;
}
function setContainersCache(data) {
    writeCache(CONTAINERS_CACHE_FILE, {
        data,
        timestamp: Date.now(),
    });
}
// Metrics History - stores last 24 hours of data points (every 5 minutes = 288 points)
const MAX_HISTORY_POINTS = 288;
function getMetricsHistory() {
    return readCache(METRICS_HISTORY_FILE, []);
}
function addMetricsHistoryPoint(point) {
    const history = getMetricsHistory();
    const newPoint = {
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
function shouldAddHistoryPoint() {
    const history = getMetricsHistory();
    if (history.length === 0)
        return true;
    const lastPoint = history[history.length - 1];
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastPoint.timestamp >= fiveMinutes;
}
// Notifications
function getNotifications() {
    return readCache(NOTIFICATIONS_FILE, []);
}
function addNotification(notification) {
    const notifications = getNotifications();
    const newNotification = {
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
function markNotificationRead(id) {
    const notifications = getNotifications();
    const notification = notifications.find((n) => n.id === id);
    if (notification) {
        notification.read = true;
        writeCache(NOTIFICATIONS_FILE, notifications);
    }
}
function markAllNotificationsRead() {
    const notifications = getNotifications();
    notifications.forEach((n) => (n.read = true));
    writeCache(NOTIFICATIONS_FILE, notifications);
}
function clearNotifications() {
    writeCache(NOTIFICATIONS_FILE, []);
}
// Service status change detection
let previousServiceStatuses = {};
function checkServiceStatusChanges(services) {
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
            }
            else if (service.status === "online" && prevStatus === "offline") {
                addNotification({
                    type: "success",
                    title: "Service Recovered",
                    message: `${service.name} is back online`,
                    serviceId: service.id,
                });
            }
            else if (service.status === "degraded") {
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
function checkResourceAlerts(metrics) {
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
