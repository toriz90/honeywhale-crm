import { ETAPA_LABELS, EtapaLead } from '@/types/lead';
import { Card } from '@/components/ui/Card';

interface EtapaChartProps {
  data: { etapa: string; cantidad: number }[];
}

export function EtapaChart({ data }: EtapaChartProps) {
  const max = Math.max(1, ...data.map((d) => d.cantidad));
  return (
    <Card title="Leads por etapa">
      <div className="flex flex-col gap-2">
        {data.map((d) => {
          const pct = (d.cantidad / max) * 100;
          const label = ETAPA_LABELS[d.etapa as EtapaLead] ?? d.etapa;
          return (
            <div key={d.etapa}>
              <div className="mb-1 flex items-center justify-between text-xs text-secondary">
                <span>{label}</span>
                <span className="font-medium text-primary">{d.cantidad}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-elev-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
