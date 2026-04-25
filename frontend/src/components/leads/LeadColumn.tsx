import { DragEvent, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { ETAPA_LABELS, EtapaLead, FiltroAsignacion, Lead } from '@/types/lead';
import { useLeadsKanbanEtapa } from '@/hooks/useLeads';
import { Skeleton } from '@/components/ui/Skeleton';
import { LeadCard } from './LeadCard';

interface LeadColumnProps {
  etapa: EtapaLead;
  filtro?: FiltroAsignacion;
  onDropLead?: (leadId: string, etapa: EtapaLead) => void;
  onClickLead?: (lead: Lead) => void;
  onDragStartLead?: (e: DragEvent<HTMLDivElement>, lead: Lead) => void;
  onEnviarCorreo?: (lead: Lead) => void;
}

export function LeadColumn({
  etapa,
  filtro,
  onDropLead,
  onClickLead,
  onDragStartLead,
  onEnviarCorreo,
}: LeadColumnProps) {
  const {
    leads,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useLeadsKanbanEtapa(etapa, filtro);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    if (!hasNextPage || isFetchingNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { root, rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, leads.length]);

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
          {total}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : total === 0 ? (
          <div className="p-3 text-center text-xs text-secondary">
            Sin leads en esta etapa
          </div>
        ) : (
          <>
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={onClickLead}
                onDragStart={onDragStartLead}
                onEnviarCorreo={onEnviarCorreo}
              />
            ))}
            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-2 text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!hasNextPage && (
              <div className="py-2 text-center text-xs text-[var(--text-secondary)]">
                Sin más leads
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
