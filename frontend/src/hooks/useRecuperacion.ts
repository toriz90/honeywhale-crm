import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, mensajeDeError, unwrap } from '@/lib/api';
import {
  CambiarAtribucionPayload,
  CambiarAtribucionResponse,
  EventoRecuperacion,
} from '@/types/recuperacion';

const QK_RECUPERACION = 'recuperacion';

export function useEventosRecuperacion(leadId: string, enabled: boolean) {
  return useQuery({
    queryKey: [QK_RECUPERACION, 'eventos', leadId],
    queryFn: () =>
      unwrap<EventoRecuperacion[]>(
        api.get(`/leads/${leadId}/eventos-recuperacion`),
      ),
    enabled: enabled && !!leadId,
    staleTime: 30_000,
  });
}

export function useCambiarAtribucion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      payload,
    }: {
      leadId: string;
      payload: CambiarAtribucionPayload;
    }) =>
      unwrap<CambiarAtribucionResponse>(
        api.patch(`/leads/${leadId}/atribucion`, payload),
      ),
    onSuccess: (data, vars) => {
      toast.success('Atribución actualizada');
      // Refresco INSTANTÁNEO del detail con la respuesta del backend — evita
      // esperar al refetch para que el badge en el header del modal se
      // actualice en cuanto se cierra el modal de override.
      qc.setQueryData(['leads', 'detail', vars.leadId], data.lead);
      // Invalidación amplia para listas/kanban.
      qc.invalidateQueries({ queryKey: ['leads'] });
      // Refetch forzado del detail aunque la query esté inactive (el modal
      // pudo cerrarse antes de que llegue la respuesta).
      qc.invalidateQueries({
        queryKey: ['leads', 'detail', vars.leadId],
        refetchType: 'all',
      });
      qc.invalidateQueries({
        queryKey: [QK_RECUPERACION, 'eventos', vars.leadId],
      });
    },
    onError: (err) => {
      toast.error(mensajeDeError(err, 'No se pudo cambiar la atribución'));
    },
  });
}
