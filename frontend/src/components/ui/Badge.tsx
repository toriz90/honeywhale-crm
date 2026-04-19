import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tono = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tono?: Tono;
}

const tonos: Record<Tono, string> = {
  neutral: 'bg-elev-2 text-secondary border border-border',
  accent: 'bg-accent/15 text-accent border border-accent/40',
  success: 'bg-success/15 text-success border border-success/40',
  warning: 'bg-warning/15 text-warning border border-warning/40',
  danger: 'bg-danger/15 text-danger border border-danger/40',
};

export function Badge({ tono = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tonos[tono],
        className,
      )}
      {...props}
    />
  );
}
