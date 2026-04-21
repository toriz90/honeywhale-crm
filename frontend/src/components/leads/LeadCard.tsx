import { DragEvent, MouseEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Plus } from 'lucide-react';
import { Lead } from '@/types/lead';
import { formatMoneda } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTomarLead } from '@/hooks/useLeads';
import { mensajeDeError } from '@/lib/api';
import { BadgeTemperatura } from './BadgeTemperatura';
import { calcularTemperatura } from '@/utils/temperatura';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
  onDragStart?: (e: DragEvent<HTMLDivElement>, lead: Lead) => void;
  onEnviarCorreo?: (lead: Lead) => void;
  draggable?: boolean;
}

export function LeadCard({
  lead,
  onClick,
  onDragStart,
  onEnviarCorreo,
  draggable = true,
}: LeadCardProps) {
  const usuario = useAuthStore((s) => s.usuario);

  const puedeTomar =
    !!usuario &&
    !lead.asignado_a_id &&
    !lead.archivado &&
    (usuario.rol === 'AGENTE' ||
      usuario.rol === 'SUPERVISOR' ||
      usuario.rol === 'ADMIN');

  const temperatura = lead.fecha_pedido_wc
    ? calcularTemperatura(lead.fecha_pedido_wc)
    : null;

  const esMio = !!usuario && lead.asignado_a_id === usuario.id;

  // Borde de resalte sólo para CALIENTE/TIBIO. El resto usa el borde estándar.
  const bordeResalte =
    temperatura === 'caliente'
      ? 'border-2 border-[#ff6b35]'
      : temperatura === 'tibio'
        ? 'border border-[#f57c00]'
        : 'border border-[var(--border)]';

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      role="button"
      tabIndex={0}
      aria-label={`Lead ${lead.nombre}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(lead);
        }
      }}
      className={cn(
        'group relative cursor-pointer rounded-lg bg-[var(--bg-elev)] p-3 transition-all',
        'hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40',
        draggable && 'active:cursor-grabbing',
        bordeResalte,
      )}
    >
      {/* Fila 1: badge (izq) · nombre (centro, crece) · ✉️ + avatar/+ (der) */}
      <div className="mb-1.5 flex items-start gap-2">
        {lead.fecha_pedido_wc && (
          <BadgeTemperatura fechaPedido={lead.fecha_pedido_wc} compacto />
        )}
        <h3
          className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-[var(--text-primary)]"
          title={lead.nombre}
        >
          {lead.nombre}
        </h3>
        {onEnviarCorreo && lead.email && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEnviarCorreo(lead);
            }}
            aria-label="Enviar correo de recuperación"
            title="Enviar correo de recuperación"
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all',
              'hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40',
              // Mobile: siempre visible. Desktop: aparece en hover de la card.
              'md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100',
            )}
          >
            <Mail className="h-3.5 w-3.5" />
          </button>
        )}
        <AvatarOTomar
          lead={lead}
          esMio={esMio}
          puedeTomar={puedeTomar}
        />
      </div>

      {/* Fila 2: producto */}
      <p
        className="mb-1 truncate text-xs text-[var(--text-secondary)]"
        title={lead.producto || 'Sin productos'}
      >
        {lead.producto || 'Sin productos'}
      </p>

      {/* Fila 3: monto + moneda */}
      <div className="flex items-baseline gap-1">
        <span className="text-base font-bold text-[var(--accent)]">
          {formatMoneda(lead.monto, lead.moneda)}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {lead.moneda}
        </span>
      </div>
    </div>
  );
}

interface AvatarOTomarProps {
  lead: Lead;
  esMio: boolean;
  puedeTomar: boolean;
}

function AvatarOTomar({ lead, esMio, puedeTomar }: AvatarOTomarProps) {
  const tomar = useTomarLead();

  // Asignado: avatar de iniciales, NO clickeable, ring si es mío.
  if (lead.asignadoA) {
    return (
      <span
        aria-label={`Asignado a ${lead.asignadoA.nombre}${esMio ? ' (tú)' : ''}`}
        title={lead.asignadoA.nombre}
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white',
          esMio &&
            'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-elev)]',
        )}
        style={{ backgroundColor: colorDesdeId(lead.asignadoA.id) }}
      >
        {iniciales(lead.asignadoA.nombre)}
      </span>
    );
  }

  // Sin asignar pero el usuario no puede tomarlo: círculo decorativo.
  if (!puedeTomar) {
    return (
      <span
        aria-label="Sin asignar"
        title="Sin asignar"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border)] text-[var(--text-secondary)]"
      >
        <Plus className="h-3.5 w-3.5" />
      </span>
    );
  }

  // Sin asignar + puedeTomar: botón clickeable que dispara la mutation.
  const onTomar = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (tomar.isPending) return;
    try {
      await tomar.mutateAsync(lead.id);
      toast.success('Tomaste el lead');
    } catch (err) {
      const msg = mensajeDeError(err);
      if (/ya fue tomado/i.test(msg)) {
        toast.error('Este lead ya fue tomado por otro agente');
      } else {
        toast.error(msg || 'No se pudo tomar el lead');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onTomar}
      onKeyDown={(e) => e.stopPropagation()}
      disabled={tomar.isPending}
      aria-label="Tomar este lead"
      title="Tomar este lead"
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border)] text-[var(--text-secondary)] transition-colors',
        'hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40',
        'disabled:cursor-wait disabled:opacity-60',
      )}
    >
      {tomar.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? '?';
  const segunda = partes[1]?.[0] ?? '';
  return `${primera}${segunda}`.toUpperCase();
}

const PALETA = [
  '#58a6ff',
  '#3fb950',
  '#d29922',
  '#bc8cff',
  '#f85149',
  '#ff7b72',
  '#e3b341',
  '#56d364',
];

function colorDesdeId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return PALETA[Math.abs(hash) % PALETA.length];
}
