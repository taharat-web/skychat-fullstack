const { PrismaClient } = require('@prisma/client');
const env = require('./env');

// A single shared Prisma instance for the whole process. Re-creating clients
// (e.g. on every request, or on every nodemon reload) leaks DB connections.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__skychatPrisma ||
  new PrismaClient({
    log: env.IS_PRODUCTION ? ['error', 'warn'] : ['error', 'warn'],
  });

if (!env.IS_PRODUCTION) {
  globalForPrisma.__skychatPrisma = prisma;
}

module.exports = prisma;
