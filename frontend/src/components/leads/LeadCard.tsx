import { DragEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
// `Mail` oculto temporalmente — usaremos Octopus Mail
import { Loader2, /* Mail, */ MoreVertical, Plus, Trash2 } from 'lucide-react';
import { ETAPA_LABELS, Lead } from '@/types/lead';
import { formatMoneda } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEliminarLead, useTomarLead } from '@/hooks/useLeads';
import { mensajeDeError } from '@/lib/api';
import { BadgeTemperatura } from './BadgeTemperatura';
import { AvatarTienda, esRecuperacionOrganica } from './AvatarTienda';
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
  // onEnviarCorreo, // oculto temporalmente — usaremos Octopus Mail
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

  const totalIntentos = lead.totalIntentos ?? 0;
  const tieneBadgeIntento = totalIntentos >= 2;
  const tieneBadgeTemp = !!lead.fecha_pedido_wc;
  const muestraFilaBadges = tieneBadgeIntento || tieneBadgeTemp;

  // Borde por prioridad descendente. Recurrencia gana a temperatura porque un
  // lead caliente recurrente es más urgente que uno caliente nuevo. Sólo el
  // borde default deja que el hover lo cambie a accent — los demás conservan
  // su color en hover (el cursor-pointer ya da el feedback de clickeable).
  const claseBorde =
    totalIntentos >= 5
      ? 'border-2 border-[#ef4444] animate-pulse-slow'
      : totalIntentos >= 3
        ? 'border-2 border-[#f5a623]'
        : temperatura === 'caliente'
          ? 'border-2 border-[#ff6b35]'
          : temperatura === 'tibio'
            ? 'border border-[#f57c00]'
            : 'border border-[var(--border)] hover:border-[var(--accent)]';

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

  const ariaLabel = `Lead ${lead.nombre}, etapa ${ETAPA_LABELS[lead.etapa]}, monto ${formatMoneda(lead.monto, lead.moneda)} ${lead.moneda}`;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(lead);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-y-2 rounded-lg bg-[var(--bg-elev)] p-3.5 transition-all duration-150 ease-out md:p-3',
        'hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
        draggable && 'active:cursor-grabbing',
        claseBorde,
      )}
    >
      {/* Fila 1 — badges (izq, wrap) · acciones (der, shrink-0). */}
      {/* Renderizamos siempre la fila porque las acciones (menú/avatar) viven
          aquí; si no hay badges, el lado izquierdo queda vacío y el avatar
          queda alineado a la derecha. */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-1.5',
            !muestraFilaBadges && 'hidden',
          )}
        >
          {tieneBadgeTemp && (
            <BadgeTemperatura fechaPedido={lead.fecha_pedido_wc} compacto />
          )}
          {tieneBadgeIntento && (
            <BadgeIntento
              numero={lead.intentoNumero}
              total={lead.totalIntentos}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {puedeEliminar && (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                aria-label="Más opciones"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Más opciones"
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all',
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
          <AvatarOTomar lead={lead} esMio={esMio} puedeTomar={puedeTomar} />
        </div>
      </div>

      {/* Fila 2 — nombre del cliente */}
      <h3
        className="block w-full truncate text-sm font-semibold leading-tight text-[var(--text-primary)]"
        title={lead.nombre}
      >
        {lead.nombre}
      </h3>

      {/* Fila 3 — producto */}
      <p
        className={cn(
          'truncate text-xs text-[var(--text-secondary)]',
          !lead.producto && 'italic',
        )}
        title={lead.producto || 'Pedido sin productos'}
      >
        {lead.producto || 'Pedido sin productos'}
      </p>

      {/* Fila 4 — monto destacado + moneda */}
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
            title={`¿Eliminar lead ${lead.nombre}?`}
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
              Esta acción se puede revertir desde la base de datos pero no
              desde la interfaz. ¿Continuar?
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

  // Caso especial: recuperación orgánica (sin agente, etapa RECUPERADO,
  // recuperadoPorAgente=false). Mostramos avatar virtual de "Tienda" — no
  // hay nada que tomar y el "+" sería engañoso.
  if (esRecuperacionOrganica(lead)) {
    return <AvatarTienda />;
  }

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

// Tres niveles según totalIntentos:
//   2       → pill compacto "2º" en ámbar suave (poco ruido).
//   3-4     → pill "🔁 N intentos" sólido ámbar (#f5a623) + texto blanco.
//   5+      → mismo pill en rojo (#ef4444) + animate-pulse-slow para alerta.
// total === 1 no se renderiza (un único intento no es recurrencia).
function BadgeIntento({
  numero,
  total,
}: {
  numero: number | undefined;
  total: number | undefined;
}) {
  if (!numero || !total || total <= 1) return null;

  if (total >= 3) {
    const esAlerta = total >= 5;
    const tooltip = `Cliente recurrente — ${total} pedidos abandonados`;
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold leading-tight text-white',
          esAlerta && 'animate-pulse-slow',
        )}
        style={{ background: esAlerta ? '#ef4444' : '#f5a623' }}
        title={tooltip}
        aria-label={tooltip}
      >
        <span aria-hidden>🔁</span>
        {total} intentos
      </span>
    );
  }

  // total === 2: pill compacto.
  const tooltip = `${ordinalLargo(numero)} intento de este cliente (${total} pedidos en total)`;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight"
      style={{
        background: 'rgba(245, 124, 0, 0.18)',
        color: '#f57c00',
      }}
      title={tooltip}
      aria-label={tooltip}
    >
      {numero}º
    </span>
  );
}

function ordinalLargo(n: number): string {
  switch (n) {
    case 1:
      return '1er';
    case 2:
      return '2do';
    case 3:
      return '3er';
    default:
      return `${n}º`;
  }
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
