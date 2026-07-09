const { redisClient } = require('../config/redis');

// A user can have multiple open sockets (multiple tabs/devices). We track a
// Redis SET of socket ids per user so presence only flips to "offline" once
// every socket has disconnected.
const onlineSetKey = (userId) => `presence:online:${userId}`;

async function addSocket(userId, socketId) {
  await redisClient.sadd(onlineSetKey(userId), socketId);
}

/** Removes a socket and returns true if the user has no other open sockets. */
async function removeSocket(userId, socketId) {
  await redisClient.srem(onlineSetKey(userId), socketId);
  const remaining = await redisClient.scard(onlineSetKey(userId));
  return remaining === 0;
}

async function isOnline(userId) {
  const count = await redisClient.scard(onlineSetKey(userId));
  return count > 0;
}

async function getOnlineUserIds(userIds) {
  if (userIds.length === 0) return new Set();
  const pipeline = redisClient.pipeline();
  userIds.forEach((id) => pipeline.scard(onlineSetKey(id)));
  const results = await pipeline.exec();
  const online = new Set();
  userIds.forEach((id, i) => {
    const [, count] = results[i];
    if (count > 0) online.add(id);
  });
  return online;
}

module.exports = { addSocket, removeSocket, isOnline, getOnlineUserIds };
