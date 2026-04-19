import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import {
  CreateLeadPayload,
  EtapaLead,
  FiltrosLeads,
  Lead,
  LeadKanban,
  LeadsPaginados,
  UpdateLeadPayload,
} from '@/types/lead';

const QK_LEADS = 'leads';
const QK_KANBAN = 'leads-kanban';

export function useLeads(filtros: FiltrosLeads) {
  return useQuery({
    queryKey: [QK_LEADS, filtros],
    queryFn: () =>
      unwrap<LeadsPaginados>(api.get('/leads', { params: filtros })),
  });
}

export function useLeadKanban() {
  return useQuery({
    queryKey: [QK_KANBAN],
    queryFn: () => unwrap<LeadKanban>(api.get('/leads/kanban')),
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: [QK_LEADS, id],
    queryFn: () => unwrap<Lead>(api.get(`/leads/${id}`)),
    enabled: !!id,
  });
}

export function useCrearLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLeadPayload) =>
      unwrap<Lead>(api.post('/leads', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS] });
      qc.invalidateQueries({ queryKey: [QK_KANBAN] });
    },
  });
}

export function useActualizarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      unwrap<Lead>(api.patch(`/leads/${id}`, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS] });
      qc.invalidateQueries({ queryKey: [QK_KANBAN] });
    },
  });
}

export function useCambiarEtapa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, etapa }: { id: string; etapa: EtapaLead }) =>
      unwrap<Lead>(api.patch(`/leads/${id}/etapa`, { etapa })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS] });
      qc.invalidateQueries({ queryKey: [QK_KANBAN] });
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
      qc.invalidateQueries({ queryKey: [QK_LEADS] });
      qc.invalidateQueries({ queryKey: [QK_KANBAN] });
    },
  });
}

export function useEliminarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_LEADS] });
      qc.invalidateQueries({ queryKey: [QK_KANBAN] });
    },
  });
}
