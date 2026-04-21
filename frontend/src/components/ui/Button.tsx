import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidthOnMobile?: boolean;
}

const variantes: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover disabled:opacity-50 border border-accent',
  secondary:
    'bg-elev text-primary hover:bg-elev-2 border border-border disabled:opacity-50',
  ghost: 'bg-transparent text-primary hover:bg-elev border border-transparent',
  danger:
    'bg-danger text-white hover:opacity-90 border border-danger disabled:opacity-50',
};

const tamanos: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm md:h-8',
  md: 'h-11 px-4 text-sm md:h-10',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      fullWidthOnMobile,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40',
          variantes[variant],
          tamanos[size],
          fullWidthOnMobile && 'w-full md:w-auto',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
