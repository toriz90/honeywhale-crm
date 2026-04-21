import { DragEvent, ReactNode } from 'react';
import { ETAPA_LABELS, EtapaLead, Lead } from '@/types/lead';
import { LeadCard } from './LeadCard';

interface LeadColumnProps {
  etapa: EtapaLead;
  leads: Lead[];
  onDropLead?: (leadId: string, etapa: EtapaLead) => void;
  onClickLead?: (lead: Lead) => void;
  onDragStartLead?: (e: DragEvent<HTMLDivElement>, lead: Lead) => void;
  onEnviarCorreo?: (lead: Lead) => void;
  contador?: ReactNode;
}

export function LeadColumn({
  etapa,
  leads,
  onDropLead,
  onClickLead,
  onDragStartLead,
  onEnviarCorreo,
}: LeadColumnProps) {
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) onDropLead?.(leadId, etapa);
  };

  return (
    <div
      className="flex h-full min-w-[260px] flex-col rounded-md border border-border bg-elev"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold text-primary">
          {ETAPA_LABELS[etapa]}
        </span>
        <span className="rounded-full bg-elev-2 px-2 py-0.5 text-xs text-secondary">
          {leads.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.length === 0 && (
          <div className="p-3 text-center text-xs text-secondary">
            Sin leads en esta etapa
          </div>
        )}
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={onClickLead}
            onDragStart={onDragStartLead}
            onEnviarCorreo={onEnviarCorreo}
          />
        ))}
      </div>
    </div>
  );
}
