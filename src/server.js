'use strict';

const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { ensureConnected, disconnect } = require('./storage/redis');
const { cleanupOrphans } = require('./storage/tempFiles');
const log = require('./util/logger');

const server = http.createServer(app);
let shuttingDown = false;

async function start() {
  // Verify Redis is reachable before accepting traffic
  await ensureConnected();
  log.info('Redis verified');

  // Clean up orphan temp files from prior runs
  await cleanupOrphans();

  server.listen(config.PORT, '0.0.0.0', () => {
    log.info(`Server listening on port ${config.PORT}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`${signal} received, shutting down gracefully`);

  // Stop accepting new connections
  server.close(async () => {
    log.info('HTTP server closed');
    try {
      await disconnect();
      log.info('Redis disconnected');
    } catch (err) {
      log.error('Error disconnecting Redis', { error: err.message });
    }
    process.exit(0);
  });

  // Force exit after 30s
  setTimeout(() => {
    log.warn('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  log.error('Startup failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
