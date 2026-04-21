import { useMutation, useQuery } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

export interface MetricaEtapa {
  cantidad: number;
  monto: number;
}

export interface MetricaAgente {
  usuarioId: string;
  nombre: string;
  rol: string;
  recuperados: MetricaEtapa;
  perdidos: MetricaEtapa;
  conversionPct: number;
}

export interface MetricasMensuales {
  year: number;
  month: number;
  recuperados: MetricaEtapa;
  perdidos: MetricaEtapa;
  comparativoMesAnterior: {
    recuperadosDeltaPct: number;
    perdidosDeltaPct: number;
  };
  porAgente: MetricaAgente[];
}

export interface MetricasMensualesSerie {
  year: number;
  month: number;
  etiqueta: string;
  recuperados: MetricaEtapa;
  perdidos: MetricaEtapa;
}

export function useMetricasMensuales(year: number, month: number) {
  return useQuery({
    queryKey: ['metricas-mensuales', year, month],
    queryFn: () =>
      unwrap<MetricasMensuales>(
        api.get('/dashboard/metricas-mensuales', { params: { year, month } }),
      ),
  });
}

export function useMetricasUltimos6Meses() {
  return useQuery({
    queryKey: ['metricas-ultimos-meses', 6],
    queryFn: () =>
      unwrap<MetricasMensualesSerie[]>(
        api.get('/dashboard/metricas-ultimos-meses', { params: { n: 6 } }),
      ),
  });
}

export function useExportExcel() {
  const mutation = useMutation({
    mutationFn: async ({
      year,
      month,
    }: {
      year: number;
      month: number;
    }) => {
      const res = await api.get('/dashboard/export-excel', {
        params: { year, month },
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const mm = String(month).padStart(2, '0');
      link.setAttribute('download', `honeywhale-crm-${year}-${mm}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });

  return {
    descargar: (year: number, month: number) =>
      mutation.mutateAsync({ year, month }),
    isPending: mutation.isPending,
  };
}
