import { useState } from 'react';
import { Shield, ShieldCheck, MoreVertical, UserMinus, Ban, ShieldOff } from 'lucide-react';
import clsx from 'clsx';
import Avatar from '../common/Avatar';

const ROLE_BADGE = {
  ADMIN: { label: 'Admin', icon: ShieldCheck, className: 'text-accent-strong' },
  MODERATOR: { label: 'Moderator', icon: Shield, className: 'text-ink-secondary' },
  MEMBER: { label: '', icon: null, className: '' },
};

export default function GroupMembersList({ members, currentUserId, currentUserRole, onChangeRole, onRemove, onBan }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  function canManage(target) {
    if (target.id === currentUserId) return false;
    if (currentUserRole === 'ADMIN') return target.role !== 'ADMIN';
    if (currentUserRole === 'MODERATOR') return target.role === 'MEMBER';
    return false;
  }

  return (
    <div className="flex flex-col gap-1">
      {members.map((member) => {
        const badge = ROLE_BADGE[member.role];
        const manageable = canManage(member);

        return (
          <div key={member.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-app-elevated/60 relative">
            <Avatar src={member.avatarUrl} name={member.username} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-primary truncate">
                {member.username}
                {member.id === currentUserId && <span className="text-ink-secondary"> (you)</span>}
              </p>
              {badge.label && (
                <p className={clsx('text-xs flex items-center gap-1', badge.className)}>
                  {badge.icon && <badge.icon size={11} />}
                  {badge.label}
                </p>
              )}
            </div>

            {manageable && (
              <div className="relative">
                <button
                  onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                  className="p-1.5 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-app-hover"
                  aria-label={`Manage ${member.username}`}
                >
                  <MoreVertical size={16} />
                </button>
                {openMenuId === member.id && (
                  <div className="absolute right-0 top-9 bg-app-elevated border border-app-border rounded-lg shadow-panel py-1 w-44 z-20">
                    {currentUserRole === 'ADMIN' && member.role === 'MEMBER' && (
                      <button
                        onClick={() => {
                          onChangeRole(member.id, 'MODERATOR');
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-primary hover:bg-app-hover"
                      >
                        <Shield size={13} /> Make moderator
                      </button>
                    )}
                    {currentUserRole === 'ADMIN' && member.role === 'MODERATOR' && (
                      <button
                        onClick={() => {
                          onChangeRole(member.id, 'MEMBER');
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-primary hover:bg-app-hover"
                      >
                        <ShieldOff size={13} /> Remove moderator
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onRemove(member.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-primary hover:bg-app-hover"
                    >
                      <UserMinus size={13} /> Remove from group
                    </button>
                    {currentUserRole === 'ADMIN' && (
                      <button
                        onClick={() => {
                          onBan(member.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                      >
                        <Ban size={13} /> Ban from group
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
