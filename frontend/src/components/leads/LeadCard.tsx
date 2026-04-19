import { DragEvent } from 'react';
import { Lead } from '@/types/lead';
import { formatMoneda } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface LeadCardProps {
  lead: Lead;
  onClick?: (lead: Lead) => void;
  onDragStart?: (e: DragEvent<HTMLDivElement>, lead: Lead) => void;
}

export function LeadCard({ lead, onClick, onDragStart }: LeadCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, lead)}
      onClick={() => onClick?.(lead)}
      className="cursor-grab rounded-md border border-border bg-elev-2 p-3 text-sm transition-colors hover:border-accent/50 active:cursor-grabbing"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-medium text-primary">{lead.nombre}</span>
        <span className="text-xs text-secondary">{lead.moneda}</span>
      </div>
      <div className="mb-2 truncate text-xs text-secondary">{lead.producto}</div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-accent">
          {formatMoneda(lead.monto, lead.moneda)}
        </span>
        {lead.asignadoA ? (
          <Badge tono="accent">{lead.asignadoA.nombre}</Badge>
        ) : (
          <Badge>Sin asignar</Badge>
        )}
      </div>
    </div>
  );
}
