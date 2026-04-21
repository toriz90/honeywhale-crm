import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useStatsTemperatura } from '@/hooks/useLeads';
import { formatMoneda } from '@/lib/utils';
import {
  estiloTemperatura,
  Temperatura,
} from '@/utils/temperatura';
import { StatsTemperatura } from '@/types/lead';

interface Fila {
  key: keyof StatsTemperatura;
  temperatura: Temperatura;
  label: string;
}

const FILAS: Fila[] = [
  { key: 'calientes', temperatura: 'caliente', label: 'Calientes' },
  { key: 'tibios', temperatura: 'tibio', label: 'Tibios' },
  { key: 'templados', temperatura: 'templado', label: 'Templados' },
  { key: 'enfriandose', temperatura: 'enfriandose', label: 'Enfriándose' },
  { key: 'frios', temperatura: 'frio', label: 'Fríos' },
  { key: 'congelados', temperatura: 'congelado', label: 'Congelados' },
];

export function CalorPipeline() {
  // Refetch cada 2 minutos según especificación.
  const { data, isLoading } = useStatsTemperatura(120_000);

  if (isLoading || !data) {
    return (
      <Card title="Calor del pipeline" description="Leads NUEVOS sin tomar">
        <Skeleton className="h-48" />
      </Card>
    );
  }

  const totalOportunidad = FILAS.reduce(
    (sum, f) => sum + data[f.key].montoTotal,
    0,
  );

  return (
    <Card
      title="Calor del pipeline"
      description="Leads en NUEVO con temperatura por antigüedad del pedido"
    >
      <div className="flex flex-col gap-2">
        {FILAS.map((f) => {
          const bucket = data[f.key];
          const e = estiloTemperatura(f.temperatura);
          return (
            <div
              key={f.key}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-elev-2 px-3 py-2"
              style={{ opacity: e.opacity }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold"
                  style={{ background: e.bg, color: e.text }}
                >
                  {e.emoji}
                </span>
                <span className="text-sm font-medium text-primary">
                  {f.label}
                </span>
              </div>
              <div className="flex items-baseline gap-3 text-right">
                <span className="text-base font-semibold text-primary">
                  {bucket.count}
                </span>
                <span className="text-xs text-secondary">
                  {bucket.montoTotal > 0
                    ? `~${formatMoneda(bucket.montoTotal)}`
                    : '─'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-secondary">Total oportunidad</span>
        <span className="font-semibold text-accent">
          {formatMoneda(totalOportunidad)}
        </span>
      </div>
    </Card>
  );
}
