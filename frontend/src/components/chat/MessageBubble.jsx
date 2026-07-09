import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Pencil, Trash2, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import useClickOutside from '../../hooks/useClickOutside';

function aggregateStatus(statuses = []) {
  if (statuses.length === 0) return 'SENT';
  if (statuses.every((s) => s.status === 'SEEN')) return 'SEEN';
  if (statuses.every((s) => s.status === 'DELIVERED' || s.status === 'SEEN')) return 'DELIVERED';
  return 'SENT';
}

function StatusTick({ status }) {
  if (status === 'SEEN') return <CheckCheck size={15} className="text-accent-strong" />;
  if (status === 'DELIVERED') return <CheckCheck size={15} className="text-ink-secondary" />;
  return <Check size={15} className="text-ink-secondary" />;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender = false,
  canModerate = false,
  onEdit,
  onRequestDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const canEdit = isOwn && !message.isDeleted;
  const canDelete = (isOwn || canModerate) && !message.isDeleted;
  const status = aggregateStatus(message.statuses);

  function submitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setIsEditing(false);
  }

  return (
    <div className={clsx('flex mb-1.5 group', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'relative max-w-[78%] md:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm',
          isOwn ? 'bg-accent-deep text-ink-primary rounded-br-sm' : 'bg-app-elevated text-ink-primary rounded-bl-sm',
          message.isDeleted && 'opacity-60 italic'
        )}
      >
        {showSender && !isOwn && (
          <p className="text-xs font-semibold text-accent-strong mb-0.5">{message.sender?.username}</p>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitEdit();
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="bg-app-bg/40 rounded-lg p-2 text-sm resize-none outline-none border border-white/10"
              rows={2}
            />
            <div className="flex gap-2 justify-end text-xs">
              <button onClick={() => setIsEditing(false)} className="text-ink-secondary hover:text-ink-primary">
                Cancel
              </button>
              <button onClick={submitEdit} className="text-accent-strong font-medium">
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        <div className="flex items-center justify-end gap-1 mt-1">
          {message.isEdited && !message.isDeleted && (
            <span className="text-[10px] text-ink-secondary/70">edited</span>
          )}
          <span className="text-[10px] text-ink-secondary/70">{format(new Date(message.createdAt), 'p')}</span>
          {isOwn && !message.isDeleted && <StatusTick status={status} />}
        </div>

        {!isEditing && (canEdit || canDelete) && (
          <div className="absolute -top-3 -left-8 hidden group-hover:block" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 rounded-full bg-app-elevated border border-app-border flex items-center justify-center text-ink-secondary hover:text-ink-primary"
              aria-label="Message options"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute top-8 left-0 bg-app-elevated border border-app-border rounded-lg shadow-panel py-1 w-32 z-10">
                {canEdit && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-primary hover:bg-app-hover"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      onRequestDelete(message);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
