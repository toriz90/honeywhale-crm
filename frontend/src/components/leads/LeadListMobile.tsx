import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ETAPA_LABELS,
  EtapaLead,
  Lead,
} from '@/types/lead';
import { formatFecha, formatMoneda } from '@/lib/utils';

interface LeadListMobileProps {
  leads: Lead[];
  onClickLead: (lead: Lead) => void;
  onEliminar?: (lead: Lead) => void;
  puedeEliminar?: boolean;
}

export function LeadListMobile({
  leads,
  onClickLead,
  onEliminar,
  puedeEliminar,
}: LeadListMobileProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-secondary">
        No hay leads con esos filtros.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="rounded-md border border-border bg-elev p-4 shadow-sm"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <button
              onClick={() => onClickLead(lead)}
              className="flex-1 text-left"
            >
              <div className="text-base font-semibold text-primary">
                {lead.nombre}
              </div>
              <div className="text-xs text-secondary">{lead.producto}</div>
            </button>
            <Badge tono="accent">{ETAPA_LABELS[lead.etapa as EtapaLead]}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MetaItem label="Email" value={lead.email ?? '—'} />
            <MetaItem label="Teléfono" value={lead.telefono} />
            <MetaItem
              label="Monto"
              value={formatMoneda(lead.monto, lead.moneda)}
              highlight
            />
            <MetaItem label="Creado" value={formatFecha(lead.created_at)} />
            <div className="col-span-2">
              <MetaItem
                label="Asignado"
                value={lead.asignadoA?.nombre ?? 'Sin asignar'}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {puedeEliminar && onEliminar && (
              <button
                onClick={() => onEliminar(lead)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-danger hover:bg-danger/10"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Button variant="secondary" size="sm" onClick={() => onClickLead(lead)}>
              Ver
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetaItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-secondary">
        {label}
      </div>
      <div
        className={
          highlight ? 'text-sm font-semibold text-accent' : 'text-sm text-primary'
        }
      >
        {value}
      </div>
    </div>
  );
}
