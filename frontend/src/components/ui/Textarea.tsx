import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const taId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={taId} className="text-sm font-medium text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          className={cn(
            'min-h-[100px] w-full rounded-md border border-border bg-elev px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
