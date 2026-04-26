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
    onSuccess: (_data, vars) => {
      toast.success('Atribución actualizada');
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({
        queryKey: [QK_RECUPERACION, 'eventos', vars.leadId],
      });
    },
    onError: (err) => {
      toast.error(mensajeDeError(err, 'No se pudo cambiar la atribución'));
    },
  });
}
