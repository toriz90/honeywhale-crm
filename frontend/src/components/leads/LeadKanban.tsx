import { DragEvent } from 'react';
import { toast } from 'sonner';
import { ETAPAS, EtapaLead, FiltroAsignacion, Lead } from '@/types/lead';
import { useCambiarEtapa } from '@/hooks/useLeads';
import { LeadColumn } from './LeadColumn';
import { mensajeDeError } from '@/lib/api';

interface LeadKanbanProps {
  filtro?: FiltroAsignacion;
  onClickLead?: (lead: Lead) => void;
  onEnviarCorreo?: (lead: Lead) => void;
}

export function LeadKanban({
  filtro,
  onClickLead,
  onEnviarCorreo,
}: LeadKanbanProps) {
  const cambiarEtapa = useCambiarEtapa();

  const onDragStart = (e: DragEvent<HTMLDivElement>, lead: Lead) => {
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = async (leadId: string, etapa: EtapaLead) => {
    try {
      await cambiarEtapa.mutateAsync({ id: leadId, etapa });
      toast.success('Etapa actualizada');
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo mover el lead'));
    }
  };

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {ETAPAS.map((etapa) => (
        <LeadColumn
          key={etapa}
          etapa={etapa}
          filtro={filtro}
          onDropLead={onDrop}
          onClickLead={onClickLead}
          onDragStartLead={onDragStart}
          onEnviarCorreo={onEnviarCorreo}
        />
      ))}
    </div>
  );
}
