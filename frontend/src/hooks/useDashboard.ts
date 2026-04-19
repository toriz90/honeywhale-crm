import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import { KpisDashboard } from '@/types/configuracion';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => unwrap<KpisDashboard>(api.get('/dashboard/kpis')),
    refetchInterval: 60_000,
  });
}
