import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useActividadHoy, ActividadHoyAgente } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';

type Columna =
  | 'nombre'
  | 'tomados'
  | 'contactados'
  | 'recuperados'
  | 'perdidos'
  | 'efectividad';

function efectividadDe(a: ActividadHoyAgente): number {
  const denom = a.recuperadosHoy + a.perdidosHoy;
  return denom === 0 ? 0 : Math.round((a.recuperadosHoy / denom) * 1000) / 10;
}

export function ActividadHoy() {
  const { data, isLoading } = useActividadHoy();
  const [sortBy, setSortBy] = useState<Columna>('tomados');
  const [sortAsc, setSortAsc] = useState(false);

  const filas = useMemo(() => {
    const arr = (data ?? []).map((a) => ({
      ...a,
      efectividad: efectividadDe(a),
    }));
    arr.sort((a, b) => {
      if (sortBy === 'nombre') {
        return sortAsc
          ? a.nombre.localeCompare(b.nombre)
          : b.nombre.localeCompare(a.nombre);
      }
      const get = (x: typeof arr[number]) => {
        switch (sortBy) {
          case 'tomados':
            return x.leadsTomadosHoy;
          case 'contactados':
            return x.contactadosHoy;
          case 'recuperados':
            return x.recuperadosHoy;
          case 'perdidos':
            return x.perdidosHoy;
          case 'efectividad':
            return x.efectividad;
        }
      };
      return sortAsc ? get(a) - get(b) : get(b) - get(a);
    });
    return arr;
  }, [data, sortBy, sortAsc]);

  const toggleSort = (col: Columna) => {
    if (sortBy === col) setSortAsc((v) => !v);
    else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  return (
    <Card title="Actividad de hoy" description="Movimientos del día por agente">
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : filas.length === 0 ? (
        <p className="text-sm text-secondary">
          Aún no hay actividad registrada hoy.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {filas.map((a) => (
              <div
                key={a.usuarioId}
                className="rounded-md border border-border bg-elev-2 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {a.nombre}
                  </span>
                  <span className="text-xs text-secondary">{a.rol}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Stat label="Tomados" valor={a.leadsTomadosHoy} />
                  <Stat label="Contactados" valor={a.contactadosHoy} />
                  <Stat label="Recuperados" valor={a.recuperadosHoy} />
                  <Stat label="Perdidos" valor={a.perdidosHoy} />
                </div>
                <div className="mt-2 text-right text-sm font-semibold text-accent">
                  {a.efectividad.toFixed(1)}% efectividad
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-secondary">
                <tr>
                  <Th onClick={() => toggleSort('nombre')} activo={sortBy === 'nombre'} asc={sortAsc}>
                    Agente
                  </Th>
                  <Th
                    className="text-right"
                    onClick={() => toggleSort('tomados')}
                    activo={sortBy === 'tomados'}
                    asc={sortAsc}
                  >
                    Leads tomados
                  </Th>
                  <Th
                    className="text-right"
                    onClick={() => toggleSort('contactados')}
                    activo={sortBy === 'contactados'}
                    asc={sortAsc}
                  >
                    Contactados
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
                    onClick={() => toggleSort('efectividad')}
                    activo={sortBy === 'efectividad'}
                    asc={sortAsc}
                  >
                    % Efectividad
                  </Th>
                </tr>
              </thead>
              <tbody>
                {filas.map((a) => (
                  <tr key={a.usuarioId} className="border-t border-border">
                    <td className="py-2 text-primary">
                      {a.nombre}{' '}
                      <span className="text-xs text-secondary">({a.rol})</span>
                    </td>
                    <td className="py-2 text-right text-secondary">
                      {a.leadsTomadosHoy}
                    </td>
                    <td className="py-2 text-right text-secondary">
                      {a.contactadosHoy}
                    </td>
                    <td className="py-2 text-right text-success">
                      {a.recuperadosHoy}
                    </td>
                    <td className="py-2 text-right text-danger">
                      {a.perdidosHoy}
                    </td>
                    <td className="py-2 text-right text-accent">
                      {a.efectividad.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function Stat({ label, valor }: { label: string; valor: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-secondary">
        {label}
      </div>
      <div className="text-sm text-primary">{valor}</div>
    </div>
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
