const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const prisma = require('../config/db');
const env = require('../config/env');
const logger = require('../utils/logger');
const socketAuthMiddleware = require('./socketAuth');
const presence = require('./presence');
const registerChatHandlers = require('./chatHandlers');
const registerTypingHandlers = require('./typingHandlers');
const { setIO, emitToUsers, userRoom, conversationRoom } = require('../utils/socketEmitter');
const { createRedisDuplicate } = require('../config/redis');

// Smooths over brief disconnect/reconnect blips (e.g. a page refresh)
// so friends don't see a user flicker offline-then-online. This state is
// process-local, which is an acceptable trade-off: worst case with multiple
// backend instances is a slightly less smooth transition on some requests.
const pendingOfflineTimers = new Map();
const OFFLINE_DEBOUNCE_MS = 4000;

async function getInterestedUserIds(userId) {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId, leftAt: null },
    select: { conversationId: true },
  });
  const conversationIds = rows.map((r) => r.conversationId);
  if (conversationIds.length === 0) return [];

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId: { in: conversationIds }, leftAt: null, NOT: { userId } },
    select: { userId: true },
    distinct: ['userId'],
  });
  return others.map((o) => o.userId);
}

async function broadcastPresence(userId, isOnline, lastSeenAt) {
  const interested = await getInterestedUserIds(userId);
  emitToUsers(interested, 'presence:update', { userId, isOnline, lastSeenAt });
}

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    // Reasonable defaults for a chat app: quick enough to detect drops, not
    // so aggressive it trips over slow mobile networks.
    pingInterval: 20000,
    pingTimeout: 20000,
  });

  // Enables the server to run as multiple horizontally-scaled instances
  // behind a load balancer - events emitted on one instance still reach
  // sockets connected to another.
  const pubClient = createRedisDuplicate();
  const subClient = createRedisDuplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const { userId } = socket;
    logger.debug(`Socket connected: user=${userId} socket=${socket.id}`);

    socket.join(userRoom(userId));

    // Cancel any pending "went offline" broadcast from a very recent disconnect.
    const pendingTimer = pendingOfflineTimers.get(userId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingOfflineTimers.delete(userId);
    }

    const wasOffline = !(await presence.isOnline(userId));
    await presence.addSocket(userId, socket.id);

    if (wasOffline) {
      broadcastPresence(userId, true, null).catch((err) => logger.error(err.message));
    }

    try {
      const rows = await prisma.conversationParticipant.findMany({
        where: { userId, leftAt: null },
        select: { conversationId: true },
      });
      rows.forEach((row) => socket.join(conversationRoom(row.conversationId)));
    } catch (err) {
      logger.error(`Failed to join conversation rooms for ${userId}: ${err.message}`);
    }

    registerChatHandlers(io, socket);
    registerTypingHandlers(io, socket);

    socket.on('disconnect', async () => {
      logger.debug(`Socket disconnected: user=${userId} socket=${socket.id}`);
      const isNowFullyOffline = await presence.removeSocket(userId, socket.id);
      if (!isNowFullyOffline) return;

      const timer = setTimeout(async () => {
        pendingOfflineTimers.delete(userId);
        const stillOffline = !(await presence.isOnline(userId));
        if (!stillOffline) return;

        const lastSeenAt = new Date();
        await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } }).catch(() => {});
        broadcastPresence(userId, false, lastSeenAt).catch((err) => logger.error(err.message));
      }, OFFLINE_DEBOUNCE_MS);

      pendingOfflineTimers.set(userId, timer);
    });
  });

  setIO(io);
  logger.info('Socket.IO server initialized');
  return io;
}

module.exports = initSocketServer;
