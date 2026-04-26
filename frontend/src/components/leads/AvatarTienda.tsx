import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Lead } from '@/types/lead';

const TOOLTIP = 'Compra orgánica — sin intervención del equipo';

interface AvatarTiendaProps {
  className?: string;
}

export function AvatarTienda({ className }: AvatarTiendaProps) {
  return (
    <span
      aria-label="Tienda (compra orgánica)"
      title={TOOLTIP}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        className,
      )}
    >
      <Bot className="h-4 w-4" aria-hidden />
    </span>
  );
}

export function esRecuperacionOrganica(lead: Lead | null | undefined): boolean {
  if (!lead) return false;
  if (lead.etapa !== 'RECUPERADO') return false;
  if (lead.asignadoA) return false;
  const v = lead.recuperadoPorAgente;
  if (v === null || v === undefined) return false;
  // Normaliza 0/1 (TINYINT) y boolean al mismo dominio.
  return Boolean(v) === false;
}
