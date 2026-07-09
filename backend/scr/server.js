const http = require('http');
const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./config/db');
const { redisClient } = require('./config/redis');
const initSocketServer = require('./sockets');

const httpServer = http.createServer(app);
initSocketServer(httpServer);

const server = httpServer.listen(env.PORT, () => {
  logger.info(`SkyChat backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal) {
  logger.info(`${signal} received - shutting down gracefully`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      redisClient.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  });

  // Force-exit if connections haven't drained in time.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
});
