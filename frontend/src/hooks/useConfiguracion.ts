import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import {
  ActualizarConfiguracionPayload,
  ConfiguracionUI,
} from '@/types/configuracion';

const QK = 'configuracion';

export function useConfiguracion() {
  return useQuery({
    queryKey: [QK],
    queryFn: () => unwrap<ConfiguracionUI>(api.get('/configuracion')),
  });
}

export function useActualizarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ActualizarConfiguracionPayload) =>
      unwrap<ConfiguracionUI>(api.patch('/configuracion', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useProbarSmtp() {
  return useMutation({
    mutationFn: () =>
      unwrap<{ ok: boolean; error?: string }>(
        api.post('/configuracion/probar-smtp'),
      ),
  });
}

export function useEnviarCorreoPrueba() {
  return useMutation({
    mutationFn: (destinatario: string) =>
      unwrap<{ ok: boolean; messageId?: string; error?: string }>(
        api.post('/configuracion/enviar-correo-prueba', { destinatario }),
      ),
  });
}
