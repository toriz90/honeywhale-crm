import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { Lead } from '@/types/lead';

const QK_ARCHIVADOS = 'leads-archivados';
const QK_ULTIMO = 'leads-archivados-ultimo';

export interface ArchivadosPaginados {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FiltrosArchivados {
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
}

export function useArchivados(filtros: FiltrosArchivados) {
  return useQuery({
    queryKey: [QK_ARCHIVADOS, filtros],
    queryFn: () =>
      unwrap<ArchivadosPaginados>(
        api.get('/leads/archivados', { params: filtros }),
      ),
  });
}

export function useFechaUltimoArchivado() {
  return useQuery({
    queryKey: [QK_ULTIMO],
    queryFn: () =>
      unwrap<{ fecha: string | null }>(api.get('/leads/archivados/ultimo')),
  });
}

export function useArchivarMes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { year: number; month: number }) =>
      unwrap<{ total: number; archivados: number; year: number; month: number }>(
        api.post('/leads/archivar-mes', payload),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_ARCHIVADOS] });
      qc.invalidateQueries({ queryKey: [QK_ULTIMO] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDesarchivar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<Lead>(api.patch(`/leads/${id}/desarchivar`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_ARCHIVADOS] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
