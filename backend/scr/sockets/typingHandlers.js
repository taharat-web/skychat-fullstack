const { conversationRoom } = require('../utils/socketEmitter');

// Typing state is intentionally NOT persisted anywhere - it's a live,
// ephemeral broadcast. The client is responsible for clearing it locally
// after a short timeout in case a `typing:stop` event is ever missed
// (e.g. the sender's tab is closed abruptly).
function registerTypingHandlers(io, socket) {
  const userId = socket.userId;

  socket.on('typing:start', (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    socket.to(conversationRoom(conversationId)).emit('typing:update', {
      conversationId,
      userId,
      username: socket.username,
      isTyping: true,
    });
  });

  socket.on('typing:stop', (payload) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    socket.to(conversationRoom(conversationId)).emit('typing:update', {
      conversationId,
      userId,
      username: socket.username,
      isTyping: false,
    });
  });
}

module.exports = registerTypingHandlers;
