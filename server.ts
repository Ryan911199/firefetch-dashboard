/**
 * Custom Server for FireFetch Dashboard
 *
 * Wraps Next.js with:
 * - Socket.IO WebSocket server for real-time updates
 * - Metrics collector for system/Docker/service monitoring
 * - Aggregation scheduler for data rollups
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initWebSocketServer } from './src/lib/websocket-server';
import { startCollector, stopCollector } from './src/lib/metrics-collector';
import { startAggregationScheduler, stopAggregationScheduler } from './src/lib/aggregation-scheduler';
import { getDb, closeDb } from './src/lib/database';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  try {
    await app.prepare();

    // Initialize database
    console.log('[Server] Initializing database...');
    getDb();

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Initialize WebSocket server
    console.log('[Server] Initializing WebSocket server...');
    initWebSocketServer(server);

    // Start metrics collector
    console.log('[Server] Starting metrics collector...');
    startCollector();

    // Start aggregation scheduler
    console.log('[Server] Starting aggregation scheduler...');
    startAggregationScheduler();

    server.listen(port, () => {
      console.log(`[Server] Ready on http://${hostname}:${port}`);
      console.log('[Server] WebSocket server ready');
      console.log('[Server] Metrics collector running');
      console.log('[Server] Aggregation scheduler running');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`[Server] Received ${signal}, shutting down gracefully...`);

      stopCollector();
      stopAggregationScheduler();
      closeDb();

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

  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

main();
