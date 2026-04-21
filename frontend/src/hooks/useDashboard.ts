import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { KpisDashboard } from '@/types/configuracion';

export interface ActividadHoyAgente {
  usuarioId: string;
  nombre: string;
  rol: string;
  leadsTomadosHoy: number;
  contactadosHoy: number;
  recuperadosHoy: number;
  perdidosHoy: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => unwrap<KpisDashboard>(api.get('/dashboard/kpis')),
    refetchInterval: 60_000,
  });
}

export function useActividadHoy() {
  return useQuery({
    queryKey: ['dashboard-actividad-hoy'],
    queryFn: () =>
      unwrap<ActividadHoyAgente[]>(api.get('/dashboard/actividad-hoy')),
    refetchInterval: 60_000,
  });
}
