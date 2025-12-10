"use strict";
/**
 * WebSocket Server for FireFetch Dashboard
 *
 * Provides real-time updates to connected clients via Socket.IO
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocketServer = initWebSocketServer;
exports.getIO = getIO;
exports.broadcastMetrics = broadcastMetrics;
exports.broadcastContainers = broadcastContainers;
exports.broadcastServices = broadcastServices;
exports.broadcastNotification = broadcastNotification;
exports.getConnectedClients = getConnectedClients;
const socket_io_1 = require("socket.io");
const metrics_collector_1 = require("./metrics-collector");
const database_1 = require("./database");
let io = null;
function initWebSocketServer(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
    });
    // Set up metrics update listeners
    const unsubMetrics = (0, metrics_collector_1.onMetricsUpdate)((metrics) => {
        io?.emit('metrics:update', metrics);
    });
    const unsubContainers = (0, metrics_collector_1.onContainerUpdate)((containers) => {
        io?.emit('containers:update', containers);
    });
    const unsubServices = (0, metrics_collector_1.onServiceUpdate)((services) => {
        io?.emit('services:update', services);
    });
    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.id}`);
        // Send initial data on connection
        sendInitialData(socket);
        // Handle client requests
        socket.on('metrics:get', () => {
            const metrics = (0, database_1.getLatestMetrics)();
            socket.emit('metrics:update', metrics);
        });
        socket.on('metrics:history', (params) => {
            const history = (0, database_1.getMetricsHistory)(params.hours || 24, params.resolution || 'live');
            socket.emit('metrics:history', history);
        });
        socket.on('containers:get', () => {
            const containers = (0, database_1.getLatestContainerStats)();
            socket.emit('containers:update', containers);
        });
        socket.on('containers:history', (params) => {
            const history = (0, database_1.getContainerHistory)(params.containerId, params.hours || 24);
            socket.emit('containers:history', { containerId: params.containerId, history });
        });
        socket.on('services:get', () => {
            const services = (0, database_1.getLatestServiceStatus)();
            socket.emit('services:update', services);
        });
        socket.on('services:history', (params) => {
            const history = (0, database_1.getServiceHistory)(params.serviceId, params.hours || 24);
            socket.emit('services:history', { serviceId: params.serviceId, history });
        });
        socket.on('notifications:get', () => {
            const notifications = (0, database_1.getNotifications)();
            const unreadCount = (0, database_1.getUnreadCount)();
            socket.emit('notifications:update', { notifications, unreadCount });
        });
        socket.on('notifications:markRead', (id) => {
            (0, database_1.markNotificationRead)(id);
            const unreadCount = (0, database_1.getUnreadCount)();
            socket.emit('notifications:unreadCount', unreadCount);
        });
        socket.on('notifications:markAllRead', () => {
            (0, database_1.markAllNotificationsRead)();
            socket.emit('notifications:unreadCount', 0);
        });
        socket.on('database:stats', () => {
            const stats = (0, database_1.getDatabaseStats)();
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
function sendInitialData(socket) {
    // Send latest metrics
    const metrics = (0, database_1.getLatestMetrics)();
    if (metrics) {
        socket.emit('metrics:update', metrics);
    }
    // Send latest containers
    const containers = (0, database_1.getLatestContainerStats)();
    if (containers.length > 0) {
        socket.emit('containers:update', containers);
    }
    // Send latest services
    const services = (0, database_1.getLatestServiceStatus)();
    if (services.length > 0) {
        socket.emit('services:update', services);
    }
    // Send recent metrics history (last 6 hours for initial chart)
    const history = (0, database_1.getMetricsHistory)(6);
    socket.emit('metrics:history', history);
    // Send notifications
    const notifications = (0, database_1.getNotifications)();
    const unreadCount = (0, database_1.getUnreadCount)();
    socket.emit('notifications:update', { notifications, unreadCount });
}
function getIO() {
    return io;
}
function broadcastMetrics(metrics) {
    io?.emit('metrics:update', metrics);
}
function broadcastContainers(containers) {
    io?.emit('containers:update', containers);
}
function broadcastServices(services) {
    io?.emit('services:update', services);
}
function broadcastNotification(notification) {
    io?.emit('notification:new', notification);
    const unreadCount = (0, database_1.getUnreadCount)();
    io?.emit('notifications:unreadCount', unreadCount);
}
function getConnectedClients() {
    return io?.sockets.sockets.size || 0;
}
