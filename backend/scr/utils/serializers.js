// Never send passwordHash (or other internal fields) to the client. Centralizing
// this means a route can't accidentally leak it by spreading a raw Prisma record
// into a JSON response.

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isEmailVerified: user.isEmailVerified,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
  };
}

// Minimal public-facing profile for search results / other users' profiles -
// deliberately excludes email.
function serializePublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    lastSeenAt: user.lastSeenAt,
  };
}

function serializeMessage(message) {
  if (!message) return null;
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    sender: message.sender ? serializePublicUser(message.sender) : null,
    type: message.type,
    content: message.isDeleted ? 'This message was deleted' : message.content,
    isEdited: message.isEdited,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    statuses: message.statuses
      ? message.statuses.map((s) => ({ userId: s.userId, status: s.status }))
      : undefined,
  };
}

module.exports = { serializeUser, serializePublicUser, serializeMessage };
