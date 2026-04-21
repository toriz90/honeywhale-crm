import { useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical } from 'lucide-react';
import {
  ETAPAS,
  ETAPA_LABELS,
  EtapaLead,
  Lead,
  LeadKanban as LeadKanbanTipo,
} from '@/types/lead';
import { useCambiarEtapa } from '@/hooks/useLeads';
import { Modal } from '@/components/ui/Modal';
import { formatMoneda } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { mensajeDeError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BadgeTemperatura } from './BadgeTemperatura';

interface LeadKanbanMobileProps {
  data: LeadKanbanTipo;
  onClickLead?: (lead: Lead) => void;
}

export function LeadKanbanMobile({ data, onClickLead }: LeadKanbanMobileProps) {
  const [etapaActiva, setEtapaActiva] = useState<EtapaLead>(ETAPAS[0]);
  const [leadAccion, setLeadAccion] = useState<Lead | null>(null);
  const cambiarEtapa = useCambiarEtapa();

  const leads = data[etapaActiva] ?? [];

  const mover = async (lead: Lead, etapa: EtapaLead) => {
    if (etapa === lead.etapa) {
      setLeadAccion(null);
      return;
    }
    try {
      await cambiarEtapa.mutateAsync({ id: lead.id, etapa });
      toast.success(`Lead movido a ${ETAPA_LABELS[etapa]}`);
      setLeadAccion(null);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo mover el lead'));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-elev px-2 py-2">
        {ETAPAS.map((etapa) => {
          const activa = etapa === etapaActiva;
          const cantidad = (data[etapa] ?? []).length;
          return (
            <button
              key={etapa}
              onClick={() => setEtapaActiva(etapa)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activa
                  ? 'bg-accent text-white'
                  : 'bg-elev-2 text-secondary hover:text-primary',
              )}
            >
              {ETAPA_LABELS[etapa]}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px]',
                  activa ? 'bg-white/20' : 'bg-border/60 text-secondary',
                )}
              >
                {cantidad}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {leads.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-secondary">
            Sin leads en {ETAPA_LABELS[etapaActiva]}.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-start justify-between gap-2 rounded-md border border-border bg-elev-2 p-3"
              >
                <button
                  type="button"
                  onClick={() => onClickLead?.(lead)}
                  className="flex-1 text-left"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-medium text-primary">
                      {lead.nombre}
                    </span>
                    {lead.fecha_pedido_wc ? (
                      <BadgeTemperatura
                        fechaPedido={lead.fecha_pedido_wc}
                        compacto
                      />
                    ) : (
                      <span className="text-xs text-secondary">
                        {lead.moneda}
                      </span>
                    )}
                  </div>
                  <div className="mb-2 truncate text-xs text-secondary">
                    {lead.producto}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-accent">
                      {formatMoneda(lead.monto, lead.moneda)}
                    </span>
                    {lead.asignadoA ? (
                      <Badge tono="accent">{lead.asignadoA.nombre}</Badge>
                    ) : (
                      <Badge>Sin asignar</Badge>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setLeadAccion(lead)}
                  aria-label="Mover de etapa"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-elev hover:text-primary"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!leadAccion}
        onClose={() => setLeadAccion(null)}
        title={leadAccion ? `Mover: ${leadAccion.nombre}` : undefined}
        size="sm"
        fullScreenOnMobile={false}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-secondary">Selecciona nueva etapa:</p>
          {ETAPAS.map((etapa) => {
            const actual = etapa === leadAccion?.etapa;
            return (
              <button
                key={etapa}
                disabled={actual || cambiarEtapa.isPending}
                onClick={() => leadAccion && mover(leadAccion, etapa)}
                className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-3 text-left text-sm transition-colors',
                  actual
                    ? 'cursor-default border-border bg-elev-2 text-secondary'
                    : 'border-border text-primary hover:border-accent hover:bg-elev-2',
                )}
              >
                <span>{ETAPA_LABELS[etapa]}</span>
                {actual && (
                  <span className="text-xs text-secondary">(actual)</span>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
