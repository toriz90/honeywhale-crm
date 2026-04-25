import { DragEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
// `Mail` oculto temporalmente â€” usaremos Octopus Mail
import { Loader2, /* Mail, */ MoreVertical, Plus, Trash2 } from 'lucide-react';
import { Lead } from '@/types/lead';
import { formatMoneda } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEliminarLead, useTomarLead } from '@/hooks/useLeads';
import { mensajeDeError } from '@/lib/api';
import { BadgeTemperatura } from './BadgeTemperatura';
import { calcularTemperatura } from '@/utils/temperatura';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

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
  // onEnviarCorreo, // oculto temporalmente â€” usaremos Octopus Mail
  draggable = true,
}: LeadCardProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const eliminar = useEliminarLead();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const puedeTomar =
    !!usuario &&
    !lead.asignado_a_id &&
    !lead.archivado &&
    (usuario.rol === 'AGENTE' ||
      usuario.rol === 'SUPERVISOR' ||
      usuario.rol === 'ADMIN');

  const puedeEliminar = usuario?.rol === 'ADMIN';

  const temperatura = lead.fecha_pedido_wc
    ? calcularTemperatura(lead.fecha_pedido_wc)
    : null;

  const esMio = !!usuario && lead.asignado_a_id === usuario.id;

  // Borde de resalte sÃ³lo para CALIENTE/TIBIO. El resto usa el borde estÃ¡ndar.
  const bordeResalte =
    temperatura === 'caliente'
      ? 'border-2 border-[#ff6b35]'
      : temperatura === 'tibio'
        ? 'border border-[#f57c00]'
        : 'border border-[var(--border)]';

  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [menuOpen]);

  const onConfirmarEliminar = async () => {
    if (eliminar.isPending) return;
    try {
      await eliminar.mutateAsync(lead.id);
      toast.success('Lead eliminado');
      setConfirmOpen(false);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo eliminar el lead'));
    }
  };

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
      {/* Fila 1: badge (izq) Â· nombre (centro, crece) Â· â‹® + avatar/+ (der) */}
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
        {/* Oculto temporalmente â€” usaremos Octopus Mail
        {onEnviarCorreo && lead.email && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEnviarCorreo(lead);
            }}
            aria-label="Enviar correo de recuperaciÃ³n"
            title="Enviar correo de recuperaciÃ³n"
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
        */}
        {puedeEliminar && (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-label="MÃ¡s opciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="MÃ¡s opciones"
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all',
                'hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40',
                'md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100',
                menuOpen && 'md:opacity-100',
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 z-30 min-w-[160px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-elev)] py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar lead
                </button>
              </div>
            )}
          </div>
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
        <span className="text-lg font-bold text-[var(--monto-color)]">
          {formatMoneda(lead.monto, lead.moneda)}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {lead.moneda}
        </span>
      </div>

      {puedeEliminar && (
        <div onClick={(e) => e.stopPropagation()}>
          <Modal
            open={confirmOpen}
            onClose={() => {
              if (!eliminar.isPending) setConfirmOpen(false);
            }}
            title={`Â¿Eliminar lead ${lead.nombre}?`}
            size="sm"
            fullScreenOnMobile={false}
            footer={
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={eliminar.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={onConfirmarEliminar}
                  loading={eliminar.isPending}
                >
                  Eliminar
                </Button>
              </div>
            }
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Esta acciÃ³n se puede revertir desde la base de datos pero no
              desde la interfaz. Â¿Continuar?
            </p>
          </Modal>
        </div>
      )}
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

  // Asignado: avatar de iniciales, NO clickeable, ring si es mÃ­o.
  if (lead.asignadoA) {
    return (
      <span
        aria-label={`Asignado a ${lead.asignadoA.nombre}${esMio ? ' (tÃº)' : ''}`}
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

  // Sin asignar pero el usuario no puede tomarlo: cÃ­rculo decorativo.
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

  // Sin asignar + puedeTomar: botÃ³n clickeable que dispara la mutation.
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
