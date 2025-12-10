/**
 * WebSocket Server for FireFetch Dashboard
 *
 * Provides real-time updates to connected clients via Socket.IO
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import {
  onMetricsUpdate,
  onContainerUpdate,
  onServiceUpdate,
} from './metrics-collector';
import {
  getLatestMetrics,
  getLatestContainerStats,
  getLatestServiceStatus,
  getMetricsHistory,
  getContainerHistory,
  getServiceHistory,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  getDatabaseStats,
  MetricsSnapshot,
  ContainerSnapshot,
  ServiceSnapshot,
} from './database';

let io: SocketIOServer | null = null;

export function initWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Set up metrics update listeners
  const unsubMetrics = onMetricsUpdate((metrics) => {
    io?.emit('metrics:update', metrics);
  });

  const unsubContainers = onContainerUpdate((containers) => {
    io?.emit('containers:update', containers);
  });

  const unsubServices = onServiceUpdate((services) => {
    io?.emit('services:update', services);
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Send initial data on connection
    sendInitialData(socket);

    // Handle client requests
    socket.on('metrics:get', () => {
      const metrics = getLatestMetrics();
      socket.emit('metrics:update', metrics);
    });

    socket.on('metrics:history', (params: { hours?: number; resolution?: 'live' | 'hourly' | 'daily' }) => {
      const history = getMetricsHistory(params.hours || 24, params.resolution || 'live');
      socket.emit('metrics:history', history);
    });

    socket.on('containers:get', () => {
      const containers = getLatestContainerStats();
      socket.emit('containers:update', containers);
    });

    socket.on('containers:history', (params: { containerId: string; hours?: number }) => {
      const history = getContainerHistory(params.containerId, params.hours || 24);
      socket.emit('containers:history', { containerId: params.containerId, history });
    });

    socket.on('services:get', () => {
      const services = getLatestServiceStatus();
      socket.emit('services:update', services);
    });

    socket.on('services:history', (params: { serviceId: string; hours?: number }) => {
      const history = getServiceHistory(params.serviceId, params.hours || 24);
      socket.emit('services:history', { serviceId: params.serviceId, history });
    });

    socket.on('notifications:get', () => {
      const notifications = getNotifications();
      const unreadCount = getUnreadCount();
      socket.emit('notifications:update', { notifications, unreadCount });
    });

    socket.on('notifications:markRead', (id: number) => {
      markNotificationRead(id);
      const unreadCount = getUnreadCount();
      socket.emit('notifications:unreadCount', unreadCount);
    });

    socket.on('notifications:markAllRead', () => {
      markAllNotificationsRead();
      socket.emit('notifications:unreadCount', 0);
    });

    socket.on('database:stats', () => {
      const stats = getDatabaseStats();
      socket.emit('database:stats', stats);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  // Clean up on server close
  io.on('close', () => {
    unsubMetrics();
    unsubContainers();
    unsubServices();
  });

  console.log('[WebSocket] Server initialized');
  return io;
}

function sendInitialData(socket: Socket): void {
  // Send latest metrics
  const metrics = getLatestMetrics();
  if (metrics) {
    socket.emit('metrics:update', metrics);
  }

  // Send latest containers
  const containers = getLatestContainerStats();
  if (containers.length > 0) {
    socket.emit('containers:update', containers);
  }

  // Send latest services
  const services = getLatestServiceStatus();
  if (services.length > 0) {
    socket.emit('services:update', services);
  }

  // Send recent metrics history (last 6 hours for initial chart)
  const history = getMetricsHistory(6);
  socket.emit('metrics:history', history);

  // Send notifications
  const notifications = getNotifications();
  const unreadCount = getUnreadCount();
  socket.emit('notifications:update', { notifications, unreadCount });
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastMetrics(metrics: MetricsSnapshot): void {
  io?.emit('metrics:update', metrics);
}

export function broadcastContainers(containers: ContainerSnapshot[]): void {
  io?.emit('containers:update', containers);
}

export function broadcastServices(services: ServiceSnapshot[]): void {
  io?.emit('services:update', services);
}

export function broadcastNotification(notification: any): void {
  io?.emit('notification:new', notification);
  const unreadCount = getUnreadCount();
  io?.emit('notifications:unreadCount', unreadCount);
}

export function getConnectedClients(): number {
  return io?.sockets.sockets.size || 0;
}
