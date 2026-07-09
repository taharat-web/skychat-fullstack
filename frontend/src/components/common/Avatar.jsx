import clsx from 'clsx';

const PALETTE = ['#00A884', '#4F9DDE', '#B37FEB', '#E8A33D', '#F15C6D', '#5DBEA3'];

function colorForName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name = '') {
  return name.slice(0, 2).toUpperCase();
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-24 h-24 text-3xl',
};

export default function Avatar({ src, name = '?', size = 'md', isOnline, className = '' }) {
  const dimensionClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className={clsx('relative shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx(dimensionClass, 'rounded-full object-cover bg-app-elevated')}
        />
      ) : (
        <div
          className={clsx(dimensionClass, 'rounded-full flex items-center justify-center font-semibold text-white')}
          style={{ backgroundColor: colorForName(name) }}
        >
          {initials(name)}
        </div>
      )}
      {typeof isOnline === 'boolean' && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-app-panel',
            size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3',
            isOnline ? 'bg-accent-strong' : 'bg-ink-muted'
          )}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
