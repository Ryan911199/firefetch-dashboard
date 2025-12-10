"use strict";
/**
 * Socket.IO Client for FireFetch Dashboard
 *
 * Provides real-time updates from the server via WebSocket
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMetrics = transformMetrics;
exports.transformContainers = transformContainers;
exports.transformServices = transformServices;
exports.getSocket = getSocket;
exports.disconnectSocket = disconnectSocket;
exports.isConnected = isConnected;
exports.subscribeToMetrics = subscribeToMetrics;
exports.subscribeToContainers = subscribeToContainers;
exports.subscribeToServices = subscribeToServices;
exports.subscribeToNotifications = subscribeToNotifications;
exports.subscribeToHistory = subscribeToHistory;
exports.requestMetrics = requestMetrics;
exports.requestContainers = requestContainers;
exports.requestServices = requestServices;
exports.requestHistory = requestHistory;
exports.requestNotifications = requestNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
const socket_io_client_1 = require("socket.io-client");
// Transform server metrics to frontend format
function transformMetrics(data) {
    return {
        cpu: data.cpu_percent,
        memory: {
            used: data.memory_used,
            total: data.memory_total,
            percent: data.memory_percent,
        },
        disk: {
            used: data.disk_used,
            total: data.disk_total,
            percent: data.disk_percent,
        },
        network: {
            up: data.network_tx,
            down: data.network_rx,
        },
        uptime: data.uptime || 0,
        loadAverage: [data.load_1m || 0, data.load_5m || 0, data.load_15m || 0],
    };
}
// Transform server containers to frontend format
function transformContainers(data) {
    return data.map((c) => ({
        id: c.container_id,
        name: c.container_name,
        status: c.status,
        cpu: c.cpu_percent,
        memory: {
            used: c.memory_used,
            limit: c.memory_limit,
        },
        network: c.network_rx !== undefined && c.network_tx !== undefined ? {
            rx: c.network_rx,
            tx: c.network_tx,
        } : undefined,
    })).sort((a, b) => {
        if (a.status === "running" && b.status !== "running")
            return -1;
        if (a.status !== "running" && b.status === "running")
            return 1;
        return a.name.localeCompare(b.name);
    });
}
// Transform server services to frontend format
function transformServices(data) {
    return data.map((s) => ({
        id: s.service_id,
        name: s.service_name,
        status: s.status,
        responseTime: s.response_time,
        uptime: s.uptime_percent,
    }));
}
// Singleton socket instance
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
function getSocket() {
    if (!socket) {
        // Connect to the same host as the page
        const url = typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000";
        socket = (0, socket_io_client_1.io)(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });
        socket.on("connect", () => {
            console.log("[WebSocket] Connected");
            reconnectAttempts = 0;
        });
        socket.on("disconnect", (reason) => {
            console.log("[WebSocket] Disconnected:", reason);
        });
        socket.on("connect_error", (error) => {
            console.error("[WebSocket] Connection error:", error.message);
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log("[WebSocket] Max reconnection attempts reached, falling back to polling");
            }
        });
    }
    return socket;
}
function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
function isConnected() {
    return socket?.connected || false;
}
// Subscribe helpers
function subscribeToMetrics(callback) {
    const s = getSocket();
    s.on("metrics:update", callback);
    return () => s.off("metrics:update", callback);
}
function subscribeToContainers(callback) {
    const s = getSocket();
    s.on("containers:update", callback);
    return () => s.off("containers:update", callback);
}
function subscribeToServices(callback) {
    const s = getSocket();
    s.on("services:update", callback);
    return () => s.off("services:update", callback);
}
function subscribeToNotifications(callback) {
    const s = getSocket();
    s.on("notifications:update", callback);
    return () => s.off("notifications:update", callback);
}
function subscribeToHistory(callback) {
    const s = getSocket();
    s.on("metrics:history", callback);
    return () => s.off("metrics:history", callback);
}
// Request helpers
function requestMetrics() {
    getSocket().emit("metrics:get");
}
function requestContainers() {
    getSocket().emit("containers:get");
}
function requestServices() {
    getSocket().emit("services:get");
}
function requestHistory(hours = 24, resolution) {
    getSocket().emit("metrics:history", { hours, resolution });
}
function requestNotifications() {
    getSocket().emit("notifications:get");
}
function markNotificationRead(id) {
    getSocket().emit("notifications:markRead", id);
}
function markAllNotificationsRead() {
    getSocket().emit("notifications:markAllRead");
}
