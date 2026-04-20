import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import {
  ActualizarConfiguracionPayload,
  ConfiguracionUI,
  WoocommerceSyncResult,
  WoocommerceTestResult,
} from '@/types/configuracion';

const QK = 'configuracion';
const QK_WC_PUBLICO = 'woocommerce-publico';

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

export function useProbarWoocommerce() {
  return useMutation({
    mutationFn: () =>
      unwrap<WoocommerceTestResult>(api.post('/woocommerce/probar-conexion')),
  });
}

export function useSyncWoocommerce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap<WoocommerceSyncResult>(api.post('/woocommerce/sync-manual')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['leads-kanban'] });
    },
  });
}

export interface WoocommerceReparacionResult {
  total: number;
  reparados: number;
  sinCambios: number;
  errores: { leadId?: string; pedidoId?: string; mensaje: string }[];
}

export function useRepararLeadsWoocommerce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      unwrap<WoocommerceReparacionResult>(
        api.post('/woocommerce/reparar-leads-woocommerce'),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['leads-kanban'] });
    },
  });
}

export interface WoocommercePublico {
  habilitado: boolean;
  url: string | null;
}

export function useWoocommercePublico() {
  return useQuery({
    queryKey: [QK_WC_PUBLICO],
    queryFn: () =>
      unwrap<WoocommercePublico>(
        api.get('/configuracion/woocommerce-publico'),
      ),
    staleTime: 5 * 60 * 1000,
  });
}
