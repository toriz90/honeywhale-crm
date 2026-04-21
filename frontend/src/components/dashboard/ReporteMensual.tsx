import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Download,
  PiggyBank,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useExportExcel,
  useMetricasMensuales,
  useMetricasUltimos6Meses,
  MetricaAgente,
} from '@/hooks/useMetricas';
import { formatMoneda } from '@/lib/utils';
import { mensajeDeError } from '@/lib/api';
import { cn } from '@/lib/utils';

const MESES = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

type ColumnaAgente = 'nombre' | 'recuperados' | 'perdidos' | 'conversion';

export function ReporteMensual() {
  const ahora = useMemo(() => new Date(), []);
  const añosDisponibles = useMemo(() => {
    const y = ahora.getFullYear();
    return [y, y - 1, y - 2];
  }, [ahora]);

  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth() + 1);
  const [sortBy, setSortBy] = useState<ColumnaAgente>('recuperados');
  const [sortAsc, setSortAsc] = useState(false);

  const metricas = useMetricasMensuales(year, month);
  const serie = useMetricasUltimos6Meses();
  const exportar = useExportExcel();

  const toggleSort = (col: ColumnaAgente) => {
    if (sortBy === col) {
      setSortAsc((v) => !v);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  const agentesOrdenados = useMemo((): MetricaAgente[] => {
    const arr = metricas.data?.porAgente ? [...metricas.data.porAgente] : [];
    arr.sort((a, b) => {
      let av = 0;
      let bv = 0;
      switch (sortBy) {
        case 'nombre':
          return sortAsc
            ? a.nombre.localeCompare(b.nombre)
            : b.nombre.localeCompare(a.nombre);
        case 'recuperados':
          av = a.recuperados.cantidad;
          bv = b.recuperados.cantidad;
          break;
        case 'perdidos':
          av = a.perdidos.cantidad;
          bv = b.perdidos.cantidad;
          break;
        case 'conversion':
          av = a.conversionPct;
          bv = b.conversionPct;
          break;
      }
      return sortAsc ? av - bv : bv - av;
    });
    return arr;
  }, [metricas.data, sortBy, sortAsc]);

  const descargar = async () => {
    try {
      await exportar.descargar(year, month);
      toast.success('Excel descargado');
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo descargar el Excel'));
    }
  };

  const serieData = (serie.data ?? []).map((s) => ({
    etiqueta: s.etiqueta,
    Recuperados: s.recuperados.cantidad,
    Perdidos: s.perdidos.cantidad,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-primary">
            Reporte mensual
          </h2>
          <p className="text-sm text-secondary">
            Recuperaciones y pérdidas del mes y los 6 meses recientes.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-32">
            <Select
              label="Año"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              options={añosDisponibles.map((y) => ({
                value: String(y),
                label: String(y),
              }))}
            />
          </div>
          <div className="w-40">
            <Select
              label="Mes"
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
              options={MESES}
            />
          </div>
          <Button
            variant="secondary"
            onClick={descargar}
            loading={exportar.isPending}
          >
            <Download className="h-4 w-4" />
            Descargar Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricas.isLoading || !metricas.data ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <KpiDelta
              titulo="Recuperados (cantidad)"
              valor={metricas.data.recuperados.cantidad}
              delta={metricas.data.comparativoMesAnterior.recuperadosDeltaPct}
              positivoBueno
              Icono={PiggyBank}
            />
            <KpiDelta
              titulo="Recuperados (monto)"
              valor={formatMoneda(metricas.data.recuperados.monto)}
              delta={metricas.data.comparativoMesAnterior.recuperadosDeltaPct}
              positivoBueno
              Icono={PiggyBank}
              soloIcono
            />
            <KpiDelta
              titulo="Perdidos (cantidad)"
              valor={metricas.data.perdidos.cantidad}
              delta={metricas.data.comparativoMesAnterior.perdidosDeltaPct}
              positivoBueno={false}
              Icono={TrendingDown}
            />
            <KpiDelta
              titulo="Perdidos (monto)"
              valor={formatMoneda(metricas.data.perdidos.monto)}
              delta={metricas.data.comparativoMesAnterior.perdidosDeltaPct}
              positivoBueno={false}
              Icono={TrendingDown}
              soloIcono
            />
          </>
        )}
      </div>

      <Card title="Últimos 6 meses" description="Recuperados vs. perdidos">
        {serie.isLoading || !serie.data ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis dataKey="etiqueta" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  cursor={{ fill: 'var(--bg-elev-2)' }}
                />
                <Legend />
                <Bar dataKey="Recuperados" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Perdidos" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Desempeño por agente" description="Ordena con clic en la cabecera">
        {metricas.isLoading || !metricas.data ? (
          <Skeleton className="h-48" />
        ) : agentesOrdenados.length === 0 ? (
          <p className="text-sm text-secondary">
            Sin actividad de agentes en este mes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-secondary">
                <tr>
                  <Th onClick={() => toggleSort('nombre')} activo={sortBy === 'nombre'} asc={sortAsc}>
                    Agente
                  </Th>
                  <Th
                    className="text-right"
                    onClick={() => toggleSort('recuperados')}
                    activo={sortBy === 'recuperados'}
                    asc={sortAsc}
                  >
                    Recuperados
                  </Th>
                  <Th
                    className="text-right"
                    onClick={() => toggleSort('perdidos')}
                    activo={sortBy === 'perdidos'}
                    asc={sortAsc}
                  >
                    Perdidos
                  </Th>
                  <Th
                    className="text-right"
                    onClick={() => toggleSort('conversion')}
                    activo={sortBy === 'conversion'}
                    asc={sortAsc}
                  >
                    % Conversión
                  </Th>
                </tr>
              </thead>
              <tbody>
                {agentesOrdenados.map((a) => (
                  <tr key={a.usuarioId} className="border-t border-border">
                    <td className="py-2 text-primary">{a.nombre}</td>
                    <td className="py-2 text-right text-secondary">
                      {a.recuperados.cantidad}{' '}
                      <span className="text-xs text-secondary/70">
                        ({formatMoneda(a.recuperados.monto)})
                      </span>
                    </td>
                    <td className="py-2 text-right text-secondary">
                      {a.perdidos.cantidad}{' '}
                      <span className="text-xs text-secondary/70">
                        ({formatMoneda(a.perdidos.monto)})
                      </span>
                    </td>
                    <td className="py-2 text-right text-accent">
                      {a.conversionPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface KpiDeltaProps {
  titulo: string;
  valor: React.ReactNode;
  delta: number;
  positivoBueno: boolean;
  Icono: React.ComponentType<{ className?: string }>;
  soloIcono?: boolean;
}

function KpiDelta({
  titulo,
  valor,
  delta,
  positivoBueno,
  Icono,
  soloIcono,
}: KpiDeltaProps) {
  const esBueno = delta === 0 ? true : delta > 0 === positivoBueno;
  const Flecha = delta === 0 ? ArrowRight : delta > 0 ? ArrowUp : ArrowDown;
  const color =
    delta === 0
      ? 'text-secondary'
      : esBueno
        ? 'text-success'
        : 'text-danger';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">
          {titulo}
        </span>
        <Icono className={cn('h-4 w-4', soloIcono ? 'text-secondary' : 'text-accent')} />
      </div>
      <div className="mt-2 text-2xl font-semibold text-primary">{valor}</div>
      <div className={cn('mt-1 flex items-center gap-1 text-xs', color)}>
        <Flecha className="h-3 w-3" />
        {delta > 0 ? '+' : ''}
        {delta.toFixed(1)}% vs. mes anterior
      </div>
    </Card>
  );
}

function Th({
  children,
  onClick,
  activo,
  asc,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  activo: boolean;
  asc: boolean;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'cursor-pointer select-none pb-2 hover:text-primary',
        activo && 'text-primary',
        className,
      )}
      onClick={onClick}
    >
      {children}
      {activo ? (asc ? ' ▲' : ' ▼') : ''}
    </th>
  );
}
