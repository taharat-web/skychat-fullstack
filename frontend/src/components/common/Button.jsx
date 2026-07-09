import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent hover:bg-accent-deep text-white disabled:opacity-50',
  secondary: 'bg-app-elevated hover:bg-app-hover text-ink-primary disabled:opacity-50',
  ghost: 'bg-transparent hover:bg-app-elevated text-ink-secondary hover:text-ink-primary',
  danger: 'bg-danger hover:bg-danger/85 text-white disabled:opacity-50',
  outline: 'border border-app-border hover:bg-app-elevated text-ink-primary',
};

const SIZES = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
