/**
 * Socket.IO Client for FireFetch Dashboard
 *
 * Provides real-time updates from the server via WebSocket
 */

import { io, Socket } from "socket.io-client";

// Types matching the server
export interface MetricsUpdate {
  timestamp: number;
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  disk_used: number;
  disk_total: number;
  disk_percent: number;
  network_rx: number;
  network_tx: number;
  load_1m?: number;
  load_5m?: number;
  load_15m?: number;
  uptime?: number;
}

export interface ContainerUpdate {
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

export interface ServiceUpdate {
  timestamp: number;
  service_id: string;
  service_name: string;
  status: string;
  response_time?: number;
  uptime_percent?: number;
}

export interface NotificationUpdate {
  notifications: Array<{
    id: number;
    timestamp: number;
    type: string;
    title: string;
    message: string;
    service_id?: string;
    read: boolean;
  }>;
  unreadCount: number;
}

// Transform server metrics to frontend format
export function transformMetrics(data: MetricsUpdate) {
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
export function transformContainers(data: ContainerUpdate[]) {
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
    if (a.status === "running" && b.status !== "running") return -1;
    if (a.status !== "running" && b.status === "running") return 1;
    return a.name.localeCompare(b.name);
  });
}

// Transform server services to frontend format
export function transformServices(data: ServiceUpdate[]) {
  return data.map((s) => ({
    id: s.service_id,
    name: s.service_name,
    status: s.status,
    responseTime: s.response_time,
    uptime: s.uptime_percent,
  }));
}

// Singleton socket instance
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export function getSocket(): Socket {
  if (!socket) {
    // Connect to the same host as the page
    const url = typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

    socket = io(url, {
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

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isConnected(): boolean {
  return socket?.connected || false;
}

// Subscribe helpers
export function subscribeToMetrics(callback: (data: MetricsUpdate) => void): () => void {
  const s = getSocket();
  s.on("metrics:update", callback);
  return () => s.off("metrics:update", callback);
}

export function subscribeToContainers(callback: (data: ContainerUpdate[]) => void): () => void {
  const s = getSocket();
  s.on("containers:update", callback);
  return () => s.off("containers:update", callback);
}

export function subscribeToServices(callback: (data: ServiceUpdate[]) => void): () => void {
  const s = getSocket();
  s.on("services:update", callback);
  return () => s.off("services:update", callback);
}

export function subscribeToNotifications(callback: (data: NotificationUpdate) => void): () => void {
  const s = getSocket();
  s.on("notifications:update", callback);
  return () => s.off("notifications:update", callback);
}

export function subscribeToHistory(callback: (data: any[]) => void): () => void {
  const s = getSocket();
  s.on("metrics:history", callback);
  return () => s.off("metrics:history", callback);
}

// Request helpers
export function requestMetrics(): void {
  getSocket().emit("metrics:get");
}

export function requestContainers(): void {
  getSocket().emit("containers:get");
}

export function requestServices(): void {
  getSocket().emit("services:get");
}

export function requestHistory(hours: number = 24, resolution?: "live" | "hourly" | "daily"): void {
  getSocket().emit("metrics:history", { hours, resolution });
}

export function requestNotifications(): void {
  getSocket().emit("notifications:get");
}

export function markNotificationRead(id: number): void {
  getSocket().emit("notifications:markRead", id);
}

export function markAllNotificationsRead(): void {
  getSocket().emit("notifications:markAllRead");
}
