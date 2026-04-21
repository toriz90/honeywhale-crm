import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreenOnMobile?: boolean;
}

const tamanos: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  fullScreenOnMobile = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const mobileShell = fullScreenOnMobile
    ? 'h-full w-full max-w-full rounded-none md:h-auto md:w-full md:rounded-lg'
    : 'w-[calc(100%-2rem)] rounded-lg md:w-full';

  const wrapperPadding = fullScreenOnMobile ? 'p-0 md:p-4' : 'p-4';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 md:items-center',
        wrapperPadding,
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'flex flex-col overflow-hidden border border-border bg-elev shadow-xl md:max-h-[90vh]',
          mobileShell,
          tamanos[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 md:px-5">
            <h3 className="text-base font-semibold text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded text-secondary hover:bg-elev-2 hover:text-primary"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-elev-2 px-4 py-3 md:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
