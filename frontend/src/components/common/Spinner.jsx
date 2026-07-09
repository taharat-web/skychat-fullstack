import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function Spinner({ size = 24, className = '', label = 'Loading' }) {
  return (
    <div className={clsx('flex items-center justify-center', className)} role="status" aria-label={label}>
      <Loader2 size={size} className="animate-spin text-accent" />
    </div>
  );
}
