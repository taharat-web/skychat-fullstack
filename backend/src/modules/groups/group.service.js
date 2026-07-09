const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { serializePublicUser } = require('../../utils/serializers');
const { saveAvatar, deleteAvatarIfLocal } = require('../../utils/imageStorage');
const conversationService = require('../conversations/conversation.service');
const friendService = require('../friends/friend.service');
const permissions = require('../../utils/groupPermissions');
const notificationService = require('../notifications/notification.service');
const activityLog = require('../activityLog.service');
const ACTIONS = require('../../utils/activityActions');
const { emitToUser, emitToConversation } = require('../../utils/socketEmitter');

const MAX_GROUP_MEMBERS = 250;

async function getGroupConversationOrThrow(conversationId) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { group: true },
  });
  if (!convo || convo.type !== 'GROUP') throw ApiError.notFound('Group not found');
  return convo;
}

async function createGroup(creatorId, { name, description, memberIds = [] }) {
  const uniqueMemberIds = [...new Set(memberIds)].filter((id) => id !== creatorId);

  if (uniqueMemberIds.length > 0) {
    const blockedChecks = await Promise.all(
      uniqueMemberIds.map((id) => friendService.isBlockedEitherWay(creatorId, id))
    );
    if (blockedChecks.some(Boolean)) {
      throw ApiError.forbidden('You cannot add a blocked user to a group');
    }
  }

  if (uniqueMemberIds.length + 1 > MAX_GROUP_MEMBERS) {
    throw ApiError.badRequest(`Groups are limited to ${MAX_GROUP_MEMBERS} members`);
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: 'GROUP',
      participants: {
        create: [
          { userId: creatorId, role: 'ADMIN' },
          ...uniqueMemberIds.map((userId) => ({ userId, role: 'MEMBER' })),
        ],
      },
      group: {
        create: { name, description, createdById: creatorId },
      },
    },
    include: { group: true },
  });

  await activityLog.log(creatorId, ACTIONS.GROUP_CREATED, {
    targetType: 'GROUP',
    targetId: conversation.id,
    metadata: { name },
  });

  for (const memberId of uniqueMemberIds) {
    const notification = await notificationService.create(memberId, 'GROUP_INVITE', {
      conversationId: conversation.id,
      groupName: name,
    });
    emitToUser(memberId, 'notification:new', notification);
    emitToUser(memberId, 'conversation:new', { conversationId: conversation.id });
  }

  return conversation.id;
}

async function updateGroup(userId, conversationId, updates) {
  const convo = await getGroupConversationOrThrow(conversationId);
  const participant = await conversationService.requireActiveParticipant(conversationId, userId);

  if (!permissions.canEditGroupInfo(participant.role)) {
    throw ApiError.forbidden('Only the group admin can edit group info');
  }

  await prisma.groupInfo.update({ where: { conversationId }, data: updates });
  await activityLog.log(userId, ACTIONS.GROUP_UPDATED, {
    targetType: 'GROUP',
    targetId: conversationId,
    metadata: updates,
  });

  const updated = { ...convo.group, ...updates };
  emitToConversation(conversationId, 'group:updated', {
    conversationId,
    name: updated.name,
    description: updated.description,
    avatarUrl: updated.avatarUrl,
  });

  return updated;
}

async function updateGroupAvatar(userId, conversationId, fileBuffer) {
  const convo = await getGroupConversationOrThrow(conversationId);
  const participant = await conversationService.requireActiveParticipant(conversationId, userId);
  if (!permissions.canEditGroupInfo(participant.role)) {
    throw ApiError.forbidden('Only the group admin can change the group photo');
  }

  const avatarUrl = await saveAvatar(fileBuffer);
  await prisma.groupInfo.update({ where: { conversationId }, data: { avatarUrl } });
  await deleteAvatarIfLocal(convo.group?.avatarUrl);

  emitToConversation(conversationId, 'group:updated', { conversationId, avatarUrl });
  return avatarUrl;
}

async function deleteGroup(userId, conversationId) {
  await getGroupConversationOrThrow(conversationId);
  const participant = await conversationService.requireActiveParticipant(conversationId, userId);
  if (!permissions.canDeleteGroup(participant.role)) {
    throw ApiError.forbidden('Only the group admin can delete the group');
  }

  emitToConversation(conversationId, 'group:deleted', { conversationId });
  await prisma.conversation.delete({ where: { id: conversationId } }); // cascades via schema
  await activityLog.log(userId, ACTIONS.GROUP_DELETED, { targetType: 'GROUP', targetId: conversationId });
}

async function listMembers(userId, conversationId) {
  await getGroupConversationOrThrow(conversationId);
  await conversationService.requireActiveParticipant(conversationId, userId);

  const members = await prisma.conversationParticipant.findMany({
    where: { conversationId, leftAt: null },
    include: { user: true },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });

  return members.map((m) => ({
    ...serializePublicUser(m.user),
    role: m.role,
    isBanned: m.isBanned,
    joinedAt: m.joinedAt,
  }));
}

async function addMember(actingUserId, conversationId, targetUserId) {
  await getGroupConversationOrThrow(conversationId);
  const actingParticipant = await conversationService.requireActiveParticipant(conversationId, actingUserId);
  if (!permissions.canAddMember(actingParticipant.role)) {
    throw ApiError.forbidden('You do not have permission to add members');
  }

  if (await friendService.isBlockedEitherWay(actingUserId, targetUserId)) {
    throw ApiError.forbidden('You cannot add this user');
  }

  const memberCount = await prisma.conversationParticipant.count({ where: { conversationId, leftAt: null } });
  if (memberCount >= MAX_GROUP_MEMBERS) throw ApiError.badRequest(`Groups are limited to ${MAX_GROUP_MEMBERS} members`);

  const existing = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
  });

  if (existing) {
    if (existing.isBanned) throw ApiError.forbidden('This user has been banned from the group');
    if (!existing.leftAt) throw ApiError.conflict('User is already a member');
    await prisma.conversationParticipant.update({
      where: { id: existing.id },
      data: { leftAt: null, joinedAt: new Date(), role: 'MEMBER' },
    });
  } else {
    await prisma.conversationParticipant.create({
      data: { conversationId, userId: targetUserId, role: 'MEMBER' },
    });
  }

  const group = await prisma.groupInfo.findUnique({ where: { conversationId } });
  await activityLog.log(actingUserId, ACTIONS.GROUP_MEMBER_ADDED, {
    targetType: 'GROUP',
    targetId: conversationId,
    metadata: { targetUserId },
  });

  const notification = await notificationService.create(targetUserId, 'GROUP_INVITE', {
    conversationId,
    groupName: group?.name,
  });
  emitToUser(targetUserId, 'notification:new', notification);
  emitToUser(targetUserId, 'conversation:new', { conversationId });
  emitToConversation(conversationId, 'group:member_added', { conversationId, userId: targetUserId });
}

async function removeMember(actingUserId, conversationId, targetUserId, { ban = false } = {}) {
  await getGroupConversationOrThrow(conversationId);
  const actingParticipant = await conversationService.requireActiveParticipant(conversationId, actingUserId);
  const targetParticipant = await conversationService.getActiveParticipant(conversationId, targetUserId);
  if (!targetParticipant) throw ApiError.notFound('Member not found in this group');

  const allowed = ban
    ? permissions.canBanMember(actingParticipant.role, targetParticipant.role)
    : permissions.canRemoveMember(actingParticipant.role, targetParticipant.role);
  if (!allowed) throw ApiError.forbidden('You do not have permission to do this');

  await prisma.conversationParticipant.update({
    where: { id: targetParticipant.id },
    data: { leftAt: new Date(), isBanned: ban },
  });

  await activityLog.log(actingUserId, ban ? ACTIONS.GROUP_MEMBER_BANNED : ACTIONS.GROUP_MEMBER_REMOVED, {
    targetType: 'GROUP',
    targetId: conversationId,
    metadata: { targetUserId },
  });

  const group = await prisma.groupInfo.findUnique({ where: { conversationId } });
  const notification = await notificationService.create(
    targetUserId,
    ban ? 'GROUP_BANNED' : 'MODERATION_ACTION',
    { conversationId, groupName: group?.name, action: ban ? 'banned' : 'removed' }
  );
  emitToUser(targetUserId, 'notification:new', notification);
  emitToUser(targetUserId, ban ? 'group:banned' : 'group:member_removed', { conversationId });
  emitToConversation(conversationId, 'group:member_removed', { conversationId, userId: targetUserId, ban });
}

async function unbanMember(actingUserId, conversationId, targetUserId) {
  await getGroupConversationOrThrow(conversationId);
  const actingParticipant = await conversationService.requireActiveParticipant(conversationId, actingUserId);
  if (!permissions.canUnbanMember(actingParticipant.role)) {
    throw ApiError.forbidden('Only the group admin can unban members');
  }

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: targetUserId },
    data: { isBanned: false },
  });

  await activityLog.log(actingUserId, ACTIONS.GROUP_MEMBER_UNBANNED, {
    targetType: 'GROUP',
    targetId: conversationId,
    metadata: { targetUserId },
  });
}

async function changeRole(actingUserId, conversationId, targetUserId, newRole) {
  await getGroupConversationOrThrow(conversationId);
  const actingParticipant = await conversationService.requireActiveParticipant(conversationId, actingUserId);
  if (!permissions.canChangeRole(actingParticipant.role)) {
    throw ApiError.forbidden('Only the group admin can change member roles');
  }
  if (targetUserId === actingUserId) {
    throw ApiError.badRequest('Use "leave group" to give up the admin role');
  }

  const targetParticipant = await conversationService.getActiveParticipant(conversationId, targetUserId);
  if (!targetParticipant) throw ApiError.notFound('Member not found in this group');
  if (targetParticipant.role === 'ADMIN') throw ApiError.forbidden("You can't change the admin's role this way");

  await prisma.conversationParticipant.update({
    where: { id: targetParticipant.id },
    data: { role: newRole },
  });

  await activityLog.log(actingUserId, ACTIONS.GROUP_ROLE_CHANGED, {
    targetType: 'GROUP',
    targetId: conversationId,
    metadata: { targetUserId, newRole },
  });

  const group = await prisma.groupInfo.findUnique({ where: { conversationId } });
  const notification = await notificationService.create(targetUserId, 'GROUP_ROLE_CHANGED', {
    conversationId,
    groupName: group?.name,
    newRole,
  });
  emitToUser(targetUserId, 'notification:new', notification);
  emitToConversation(conversationId, 'group:role_changed', { conversationId, userId: targetUserId, newRole });
}

/**
 * Leaving a group is simple for a member/moderator. For an admin, someone
 * has to be left in charge: promote the longest-tenured active moderator,
 * falling back to the longest-tenured member. If the admin was the last
 * active participant, the group is deleted rather than left ownerless.
 */
async function leaveGroup(userId, conversationId) {
  await getGroupConversationOrThrow(conversationId);
  const participant = await conversationService.requireActiveParticipant(conversationId, userId);

  if (participant.role === 'ADMIN') {
    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, leftAt: null, NOT: { userId } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    if (others.length === 0) {
      await prisma.conversation.delete({ where: { id: conversationId } });
      await activityLog.log(userId, ACTIONS.GROUP_DELETED, {
        targetType: 'GROUP',
        targetId: conversationId,
        metadata: { reason: 'admin_left_no_members' },
      });
      emitToConversation(conversationId, 'group:deleted', { conversationId });
      return;
    }

    // Prisma's default `asc` on the GroupRole enum follows declaration order
    // (ADMIN, MODERATOR, MEMBER), so a moderator (if any) always sorts first.
    const successor = others[0];
    await prisma.$transaction([
      prisma.conversationParticipant.update({ where: { id: successor.id }, data: { role: 'ADMIN' } }),
      prisma.conversationParticipant.update({ where: { id: participant.id }, data: { leftAt: new Date() } }),
    ]);

    await activityLog.log(userId, ACTIONS.GROUP_OWNERSHIP_TRANSFERRED, {
      targetType: 'GROUP',
      targetId: conversationId,
      metadata: { newAdminId: successor.userId },
    });
    emitToConversation(conversationId, 'group:role_changed', {
      conversationId,
      userId: successor.userId,
      newRole: 'ADMIN',
    });
  } else {
    await prisma.conversationParticipant.update({ where: { id: participant.id }, data: { leftAt: new Date() } });
  }

  await activityLog.log(userId, ACTIONS.GROUP_MEMBER_LEFT, { targetType: 'GROUP', targetId: conversationId });
  emitToConversation(conversationId, 'group:member_removed', { conversationId, userId, ban: false });
}

module.exports = {
  createGroup,
  updateGroup,
  updateGroupAvatar,
  deleteGroup,
  listMembers,
  addMember,
  removeMember,
  unbanMember,
  changeRole,
  leaveGroup,
};
