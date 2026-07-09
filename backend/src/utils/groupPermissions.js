/**
 * Group role permission matrix.
 *
 * ADMIN      - full control: edit group info/avatar, delete the group,
 *              add/remove members, promote/demote moderators, ban/unban,
 *              delete any message.
 * MODERATOR  - "assists with moderation": can add members, kick (remove,
 *              non-permanently) normal members, and delete any message.
 *              Cannot ban, cannot change roles, cannot edit group info,
 *              cannot remove/kick admins or other moderators.
 * MEMBER     - can send messages, edit/delete their own messages, and leave.
 *
 * This module is the ONLY place these rules should be encoded. Every
 * mutating group/message endpoint calls into here rather than re-deriving
 * the rules, so the UI showing/hiding a button is never the real boundary.
 */

const ROLE_RANK = { MEMBER: 0, MODERATOR: 1, ADMIN: 2 };

function canEditGroupInfo(actingRole) {
  return actingRole === 'ADMIN';
}

function canDeleteGroup(actingRole) {
  return actingRole === 'ADMIN';
}

function canAddMember(actingRole) {
  return actingRole === 'ADMIN' || actingRole === 'MODERATOR';
}

// "Kick" = remove from the group without a ban; they could be re-added later.
function canRemoveMember(actingRole, targetRole) {
  if (actingRole === 'ADMIN') return targetRole !== 'ADMIN';
  if (actingRole === 'MODERATOR') return targetRole === 'MEMBER';
  return false;
}

function canBanMember(actingRole, targetRole) {
  return actingRole === 'ADMIN' && targetRole !== 'ADMIN';
}

function canUnbanMember(actingRole) {
  return actingRole === 'ADMIN';
}

function canChangeRole(actingRole) {
  return actingRole === 'ADMIN';
}

function canDeleteOthersMessage(actingRole) {
  return actingRole === 'ADMIN' || actingRole === 'MODERATOR';
}

function isHigherOrEqualRank(roleA, roleB) {
  return ROLE_RANK[roleA] >= ROLE_RANK[roleB];
}

module.exports = {
  canEditGroupInfo,
  canDeleteGroup,
  canAddMember,
  canRemoveMember,
  canBanMember,
  canUnbanMember,
  canChangeRole,
  canDeleteOthersMessage,
  isHigherOrEqualRank,
};
