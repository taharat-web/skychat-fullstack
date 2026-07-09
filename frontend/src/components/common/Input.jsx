import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input({ label, error, className = '', id, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm text-ink-secondary mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full bg-app-elevated border rounded-lg px-3.5 py-2.5 text-sm text-ink-primary',
          'placeholder:text-ink-muted transition-colors',
          error ? 'border-danger' : 'border-app-border focus:border-accent',
          className
        )}
        {...props}
      />
      {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
    </div>
  );
});

export default Input;
