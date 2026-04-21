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
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36">
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
          </div>
          <div className="w-44">
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
          </div>
          <div className="ml-auto text-sm text-secondary">
            {data ? `${data.total} leads archivados` : ''}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
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
          <div className="flex items-center justify-between text-sm text-secondary">
            <span>
              Página {data.page} de {data.totalPages} · {data.total} leads
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
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
