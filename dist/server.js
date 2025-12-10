"use strict";
/**
 * Custom Server for FireFetch Dashboard
 *
 * Wraps Next.js with:
 * - Socket.IO WebSocket server for real-time updates
 * - Metrics collector for system/Docker/service monitoring
 * - Aggregation scheduler for data rollups
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const websocket_server_1 = require("./src/lib/websocket-server");
const metrics_collector_1 = require("./src/lib/metrics-collector");
const aggregation_scheduler_1 = require("./src/lib/aggregation-scheduler");
const database_1 = require("./src/lib/database");
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
async function main() {
    try {
        await app.prepare();
        // Initialize database
        console.log('[Server] Initializing database...');
        (0, database_1.getDb)();
        const server = (0, http_1.createServer)(async (req, res) => {
            try {
                const parsedUrl = (0, url_1.parse)(req.url, true);
                await handle(req, res, parsedUrl);
            }
            catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });
        // Initialize WebSocket server
        console.log('[Server] Initializing WebSocket server...');
        (0, websocket_server_1.initWebSocketServer)(server);
        // Start metrics collector
        console.log('[Server] Starting metrics collector...');
        (0, metrics_collector_1.startCollector)();
        // Start aggregation scheduler
        console.log('[Server] Starting aggregation scheduler...');
        (0, aggregation_scheduler_1.startAggregationScheduler)();
        server.listen(port, () => {
            console.log(`[Server] Ready on http://${hostname}:${port}`);
            console.log('[Server] WebSocket server ready');
            console.log('[Server] Metrics collector running');
            console.log('[Server] Aggregation scheduler running');
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            console.log(`[Server] Received ${signal}, shutting down gracefully...`);
            (0, metrics_collector_1.stopCollector)();
            (0, aggregation_scheduler_1.stopAggregationScheduler)();
            (0, database_1.closeDb)();
            server.close(() => {
                console.log('[Server] HTTP server closed');
                process.exit(0);
            });
            // Force exit after 10 seconds
            setTimeout(() => {
                console.error('[Server] Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (err) {
        console.error('[Server] Failed to start:', err);
        process.exit(1);
    }
}
main();
