export default function TypingIndicator({ typingUsers = {}, isGroup = false }) {
  const names = Object.values(typingUsers);
  if (names.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-ink-secondary text-xs">
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-secondary animate-blink" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-secondary animate-blink" style={{ animationDelay: '160ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-ink-secondary animate-blink" style={{ animationDelay: '320ms' }} />
      </span>
      {isGroup && (
        <span>
          {names.slice(0, 2).join(', ')}
          {names.length > 2 ? ` and ${names.length - 2} more` : ''} typing…
        </span>
      )}
    </div>
  );
}
