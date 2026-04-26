import { useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import {
  CreateLeadPayload,
  EtapaLead,
  FiltroAsignacion,
  FiltrosLeads,
  Lead,
  LeadsPaginados,
  StatsTemperatura,
  UpdateLeadPayload,
} from '@/types/lead';

// Todas las queries de leads cuelgan del prefix ['leads'] para que las
// mutaciones puedan invalidarlas con un solo invalidateQueries({ queryKey: ['leads'] }).
const QK_LEADS_ROOT = 'leads';

export interface KanbanEtapaPage {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const PAGE_SIZE_KANBAN = 50;

export function useLeads(filtros: FiltrosLeads) {
  return useQuery({
    queryKey: [QK_LEADS_ROOT, 'list', filtros],
    queryFn: () =>
      unwrap<LeadsPaginados>(api.get('/leads', { params: filtros })),
  });
}

export function useStatsTemperatura(refetchInterval = 30_000) {
  return useQuery({
    queryKey: [QK_LEADS_ROOT, 'stats-temperatura'],
    queryFn: () => unwrap<StatsTemperatura>(api.get('/leads/stats-temperatura')),
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

/**
 * Scroll infinito por columna del kanban. Cada columna mantiene su propio
 * cursor y total real (no topado). El queryKey incluye etapa+filtro para
 * que React Query separe las cachés y se reseteen cuando cualquiera cambie.
 */
export function useLeadsKanbanEtapa(
  etapa: EtapaLead,
  filtro?: FiltroAsignacion,
) {
  const query = useInfiniteQuery({
    queryKey: [QK_LEADS_ROOT, 'kanban-etapa', etapa, filtro ?? 'default'],
    queryFn: ({ pageParam }) =>
      unwrap<KanbanEtapaPage>(
        api.get(`/leads/kanban/etapa/${etapa}`, {
          params: {
            page: pageParam,
            pageSize: PAGE_SIZE_KANBAN,
            ...(filtro ? { filtro } : {}),
          },
        }),
      ),
    initialPageParam: 1 as number,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });

  const leads = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    leads,
    total,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useTomarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<Lead>(api.post(`/leads/${id}/tomar`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS_ROOT] });
    },
  });
}

export function useLead(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [QK_LEADS_ROOT, 'detail', id],
    queryFn: () => unwrap<Lead>(api.get(`/leads/${id}`)),
    enabled: enabled && !!id,
  });
}

export function useCrearLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) =>
      unwrap<Lead>(api.post('/leads', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS_ROOT] });
    },
  });
}

export function useActualizarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      unwrap<Lead>(api.patch(`/leads/${id}`, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS_ROOT] });
    },
  });
}

export function useCambiarEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, etapa }: { id: string; etapa: EtapaLead }) =>
      unwrap<Lead>(api.patch(`/leads/${id}/etapa`, { etapa })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS_ROOT] });
    },
  });
}

export function useAsignarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      asignadoAId,
    }: {
      id: string;
      asignadoAId: string | null;
    }) =>
      unwrap<Lead>(
        api.patch(`/leads/${id}/asignar`, { asignado_a_id: asignadoAId }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS_ROOT] });
    },
  });
}

export function useEliminarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS_ROOT] });
    },
  });
}
