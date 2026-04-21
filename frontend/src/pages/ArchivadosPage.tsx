import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArchiveRestore } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useArchivados,
  useDesarchivar,
  FiltrosArchivados,
} from '@/hooks/useArchivados';
import { formatFecha, formatMoneda } from '@/lib/utils';
import { mensajeDeError } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { Lead } from '@/types/lead';

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

export function ArchivadosPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const puedeDesarchivar = usuario?.rol === 'ADMIN';
  const ahora = useMemo(() => new Date(), []);
  const añosDisponibles = useMemo(() => {
    const y = ahora.getFullYear();
    return [y, y - 1, y - 2];
  }, [ahora]);

  const [year, setYear] = useState<number | ''>('');
  const [month, setMonth] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [aDesarchivar, setADesarchivar] = useState<Lead | null>(null);

  const filtros: FiltrosArchivados = {
    page,
    pageSize: 50,
    ...(year ? { year } : {}),
    ...(month ? { month } : {}),
  };

  const { data, isLoading } = useArchivados(filtros);
  const desarchivar = useDesarchivar();

  const confirmarDesarchivar = async () => {
    if (!aDesarchivar) return;
    try {
      await desarchivar.mutateAsync(aDesarchivar.id);
      toast.success('Lead desarchivado');
      setADesarchivar(null);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo desarchivar'));
    }
  };

  return (
    <>
      <Topbar titulo="Archivados" />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[auto_auto_1fr]">
          <Select
            label="Año"
            value={year === '' ? '' : String(year)}
            onChange={(e) => {
              const v = e.target.value;
              setYear(v === '' ? '' : Number(v));
              setPage(1);
            }}
            options={[
              { value: '', label: 'Todos' },
              ...añosDisponibles.map((y) => ({
                value: String(y),
                label: String(y),
              })),
            ]}
          />
          <Select
            label="Mes"
            value={month === '' ? '' : String(month)}
            onChange={(e) => {
              const v = e.target.value;
              setMonth(v === '' ? '' : Number(v));
              setPage(1);
            }}
            options={[{ value: '', label: 'Todos' }, ...MESES]}
          />
          <div className="text-sm text-secondary md:text-right">
            {data ? `${data.total} leads archivados` : ''}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:hidden">
          {isLoading || !data ? (
            <Skeleton className="h-24" />
          ) : data.data.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-secondary">
              No hay leads archivados con esos filtros.
            </div>
          ) : (
            data.data.map((lead) => (
              <div
                key={lead.id}
                className="rounded-md border border-border bg-elev p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-base font-semibold text-primary">
                      {lead.nombre}
                    </div>
                    <div className="text-xs text-secondary">
                      {lead.email ?? '—'}
                    </div>
                  </div>
                  <Badge
                    tono={lead.etapa === 'RECUPERADO' ? 'success' : 'danger'}
                  >
                    {lead.etapa === 'RECUPERADO' ? 'Recuperado' : 'Perdido'}
                  </Badge>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-secondary">
                      Monto
                    </div>
                    <div className="text-sm font-semibold text-accent">
                      {formatMoneda(lead.monto, lead.moneda)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-secondary">
                      Agente
                    </div>
                    <div className="text-sm text-primary">
                      {lead.asignadoA?.nombre ?? '—'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase text-secondary">
                      Cambio etapa
                    </div>
                    <div className="text-sm text-primary">
                      {lead.fecha_cambio_etapa
                        ? formatFecha(lead.fecha_cambio_etapa)
                        : '—'}
                    </div>
                  </div>
                </div>
                {puedeDesarchivar && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setADesarchivar(lead)}
                    fullWidthOnMobile
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    Desarchivar
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-md border border-border md:block">
          <table className="w-full text-sm">
            <thead className="bg-elev-2 text-left text-xs uppercase text-secondary">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Etapa</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Agente</th>
                <th className="px-3 py-2">Fecha cambio etapa</th>
                {puedeDesarchivar && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {isLoading || !data ? (
                <tr>
                  <td colSpan={puedeDesarchivar ? 7 : 6} className="p-4">
                    <Skeleton className="h-8" />
                  </td>
                </tr>
              ) : data.data.length === 0 ? (
                <tr>
                  <td
                    colSpan={puedeDesarchivar ? 7 : 6}
                    className="p-8 text-center text-sm text-secondary"
                  >
                    No hay leads archivados con esos filtros.
                  </td>
                </tr>
              ) : (
                data.data.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-t border-border hover:bg-elev-2"
                  >
                    <td className="px-3 py-2 text-primary">{lead.nombre}</td>
                    <td className="px-3 py-2 text-secondary">
                      {lead.email ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        tono={lead.etapa === 'RECUPERADO' ? 'success' : 'danger'}
                      >
                        {lead.etapa === 'RECUPERADO' ? 'Recuperado' : 'Perdido'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-accent">
                      {formatMoneda(lead.monto, lead.moneda)}
                    </td>
                    <td className="px-3 py-2 text-secondary">
                      {lead.asignadoA?.nombre ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-secondary">
                      {lead.fecha_cambio_etapa
                        ? formatFecha(lead.fecha_cambio_etapa)
                        : '—'}
                    </td>
                    {puedeDesarchivar && (
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setADesarchivar(lead)}
                        >
                          <ArchiveRestore className="h-4 w-4" />
                          Desarchivar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex flex-col items-stretch justify-between gap-2 text-sm text-secondary md:flex-row md:items-center">
            <span>
              Página {data.page} de {data.totalPages} · {data.total} leads
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                fullWidthOnMobile
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                fullWidthOnMobile
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!aDesarchivar}
        title="Desarchivar lead"
        message={`¿Devolver el lead de ${aDesarchivar?.nombre ?? ''} al pipeline activo?`}
        onConfirm={confirmarDesarchivar}
        onCancel={() => setADesarchivar(null)}
        loading={desarchivar.isPending}
      />
    </>
  );
}
