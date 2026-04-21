import { DragEvent } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Lead } from '@/types/lead';
import { formatMoneda } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTomarLead } from '@/hooks/useLeads';
import { mensajeDeError } from '@/lib/api';
import { BadgeTemperatura } from './BadgeTemperatura';
import {
  calcularTemperatura,
  estiloTemperatura,
} from '@/utils/temperatura';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
  onDragStart?: (e: DragEvent<HTMLDivElement>, lead: Lead) => void;
}

export function LeadCard({ lead, onClick, onDragStart }: LeadCardProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const tomar = useTomarLead();

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
  const resaltar =
    temperatura === 'caliente' || temperatura === 'tibio'
      ? estiloTemperatura(temperatura)
      : null;

  const onTomar = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const esMio = !!usuario && lead.asignado_a_id === usuario.id;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      className={cn(
        'cursor-grab rounded-md border border-border bg-elev-2 p-3 text-sm transition-colors hover:border-accent/50 active:cursor-grabbing',
      )}
      style={
        resaltar
          ? {
              border: resaltar.border,
              boxShadow: `0 0 0 1px ${resaltar.bg}33`,
            }
          : undefined
      }
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-medium text-primary">{lead.nombre}</span>
        <div className="flex items-center gap-1">
          {temperatura && <BadgeTemperatura fechaPedido={lead.fecha_pedido_wc} />}
        </div>
      </div>
      <div className="mb-2 truncate text-xs text-secondary">{lead.producto}</div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-accent">
          {formatMoneda(lead.monto, lead.moneda)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-secondary">{lead.moneda}</span>
          <AvatarAgente
            lead={lead}
            esMio={esMio}
            puedeTomar={puedeTomar}
          />
        </div>
      </div>

      {puedeTomar && (
        <button
          type="button"
          onClick={onTomar}
          disabled={tomar.isPending}
          className="mt-2 w-full rounded-md border border-accent bg-accent/10 px-2 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
        >
          {tomar.isPending ? 'Tomando...' : 'Tomar este lead'}
        </button>
      )}
    </div>
  );
}

interface AvatarAgenteProps {
  lead: Lead;
  esMio: boolean;
  puedeTomar: boolean;
}

function AvatarAgente({ lead, esMio, puedeTomar }: AvatarAgenteProps) {
  if (!lead.asignadoA) {
    return (
      <span
        aria-label="Sin asignar"
        title="Sin asignar"
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed text-secondary',
          puedeTomar ? 'border-accent/60 text-accent' : 'border-border',
        )}
      >
        {puedeTomar ? <Plus className="h-3 w-3" /> : null}
      </span>
    );
  }

  return (
    <span
      aria-label={lead.asignadoA.nombre}
      title={lead.asignadoA.nombre}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white',
        esMio && 'ring-2 ring-accent ring-offset-1 ring-offset-elev-2',
      )}
      style={{ backgroundColor: colorDesdeId(lead.asignadoA.id) }}
    >
      {iniciales(lead.asignadoA.nombre)}
    </span>
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
