// REST controllers and services need to push real-time events (e.g. a friend
// request created over HTTP should still notify the receiver's socket
// instantly). Rather than importing the socket layer into every service
// (circular dependency risk), the socket bootstrap sets its `io` instance
// here once at startup, and everyone else just calls these helpers.

let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function userRoom(userId) {
  return `user:${userId}`;
}

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
  if (!ioInstance) return;
  for (const id of userIds) emitToUser(id, event, payload);
}

function emitToConversation(conversationId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(conversationRoom(conversationId)).emit(event, payload);
}

module.exports = {
  setIO,
  emitToUser,
  emitToUsers,
  emitToConversation,
  userRoom,
  conversationRoom,
};
