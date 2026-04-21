import { ButtonHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  ariaLabel: string;
}

export const Fab = forwardRef<HTMLButtonElement, FabProps>(
  ({ icon: Icon, ariaLabel, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          'fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/50 md:hidden',
          className,
        )}
        {...props}
      >
        <Icon className="h-6 w-6" />
      </button>
    );
  },
);
Fab.displayName = 'Fab';
