import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Fab } from '@/components/ui/Fab';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { LeadKanban } from '@/components/leads/LeadKanban';
import { LeadKanbanMobile } from '@/components/leads/LeadKanbanMobile';
import { LeadListMobile } from '@/components/leads/LeadListMobile';
import { LeadForm } from '@/components/leads/LeadForm';
import {
  FiltrosLeads as FiltrosLeadsTabs,
  filtroDefaultPara,
} from '@/components/leads/FiltrosLeads';
import { BannerCalientes } from '@/components/leads/BannerCalientes';
import {
  useEliminarLead,
  useLeadKanban,
  useLeads,
} from '@/hooks/useLeads';
import { useNotificacionLeadCaliente } from '@/hooks/useNotificacionLeadCaliente';
import {
  ETAPA_LABELS,
  EtapaLead,
  FiltroAsignacion,
  FiltrosLeads,
  Lead,
} from '@/types/lead';
import { formatFecha, formatMoneda } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { mensajeDeError } from '@/lib/api';
import { cn } from '@/lib/utils';

type Vista = 'kanban' | 'lista';

function ToggleVista({
  vista,
  onChange,
}: {
  vista: Vista;
  onChange: (v: Vista) => void;
}) {
  return (
    <div className="flex rounded-md border border-border">
      <button
        onClick={() => onChange('kanban')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 text-sm',
          vista === 'kanban' ? 'bg-elev-2 text-primary' : 'text-secondary',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Kanban
      </button>
      <button
        onClick={() => onChange('lista')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 text-sm',
          vista === 'lista' ? 'bg-elev-2 text-primary' : 'text-secondary',
        )}
      >
        <List className="h-4 w-4" />
        Lista
      </button>
    </div>
  );
}

interface LeadsPageProps {
  vistaEquipo?: boolean;
}

export function LeadsPage({ vistaEquipo = false }: LeadsPageProps = {}) {
  const [vista, setVista] = useState<Vista>('kanban');
  const usuario = useAuthStore((s) => s.usuario);
  const puedeCrear = usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

  const [filtroAsignacion, setFiltroAsignacion] = useState<FiltroAsignacion>(
    filtroDefaultPara(usuario?.rol, vistaEquipo),
  );
  const [filtros, setFiltros] = useState<FiltrosLeads>({
    page: 1,
    limit: 20,
    orderBy: 'created_at',
    order: 'DESC',
  });
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [borrarLead, setBorrarLead] = useState<Lead | null>(null);

  useNotificacionLeadCaliente();

  const filtroEfectivo: FiltroAsignacion = vistaEquipo
    ? 'equipo'
    : filtroAsignacion;

  const kanban = useLeadKanban(filtroEfectivo);
  const lista = useLeads({ ...filtros, filtro: filtroEfectivo });
  const eliminar = useEliminarLead();

  const abrirNuevo = () => {
    setEditLead(null);
    setModalOpen(true);
  };

  const abrirEditar = (lead: Lead) => {
    setEditLead(lead);
    setModalOpen(true);
  };

  const confirmarBorrar = async () => {
    if (!borrarLead) return;
    try {
      await eliminar.mutateAsync(borrarLead.id);
      toast.success('Lead eliminado');
      setBorrarLead(null);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo eliminar el lead'));
    }
  };

  return (
    <>
      <Topbar
        titulo={vistaEquipo ? 'Equipo' : 'Leads'}
        acciones={
          <>
            <ToggleVista vista={vista} onChange={setVista} />
            {puedeCrear && (
              <Button onClick={abrirNuevo}>
                <Plus className="h-4 w-4" />
                Nuevo lead
              </Button>
            )}
          </>
        }
      />

      <div className="flex items-center gap-2 border-b border-border bg-elev px-4 py-2 md:hidden">
        <ToggleVista vista={vista} onChange={setVista} />
      </div>

      <BannerCalientes />
      {!vistaEquipo && (
        <FiltrosLeadsTabs
          valor={filtroAsignacion}
          onChange={setFiltroAsignacion}
        />
      )}

      {vista === 'kanban' ? (
        <>
          <div className="flex-1 overflow-hidden md:hidden">
            {kanban.isLoading || !kanban.data ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <LeadKanbanMobile data={kanban.data} onClickLead={abrirEditar} />
            )}
          </div>
          <div className="hidden flex-1 overflow-hidden md:block">
            {kanban.isLoading || !kanban.data ? (
              <div className="flex gap-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-full min-w-[260px]" />
                ))}
              </div>
            ) : (
              <LeadKanban data={kanban.data} onClickLead={abrirEditar} />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-6">
          <div className="mb-4">
            <LeadFilters filtros={filtros} onChange={setFiltros} />
          </div>

          {lista.isLoading || !lista.data ? (
            <Skeleton className="h-40" />
          ) : (
            <>
              <div className="md:hidden">
                <LeadListMobile
                  leads={lista.data.data}
                  onClickLead={abrirEditar}
                  puedeEliminar={puedeCrear}
                  onEliminar={(l) => setBorrarLead(l)}
                />
              </div>
              <div className="hidden overflow-hidden rounded-md border border-border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-elev-2 text-left text-xs uppercase text-secondary">
                    <tr>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Etapa</th>
                      <th className="px-3 py-2">Asignado</th>
                      <th className="px-3 py-2">Creado</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lista.data.data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-sm text-secondary"
                        >
                          No hay leads con esos filtros.
                        </td>
                      </tr>
                    ) : (
                      lista.data.data.map((lead) => (
                        <tr
                          key={lead.id}
                          className="cursor-pointer border-t border-border hover:bg-elev-2"
                          onClick={() => abrirEditar(lead)}
                        >
                          <td className="px-3 py-2 text-primary">{lead.nombre}</td>
                          <td className="px-3 py-2 text-secondary">
                            {lead.producto}
                          </td>
                          <td className="px-3 py-2 text-accent">
                            {formatMoneda(lead.monto, lead.moneda)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge tono="accent">
                              {ETAPA_LABELS[lead.etapa as EtapaLead]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-secondary">
                            {lead.asignadoA?.nombre ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-secondary">
                            {formatFecha(lead.created_at)}
                          </td>
                          <td
                            className="px-3 py-2 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {puedeCrear && (
                              <button
                                onClick={() => setBorrarLead(lead)}
                                className="rounded p-1 text-danger hover:bg-danger/10"
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {lista.data && lista.data.totalPages > 1 && (
            <div className="mt-3 flex flex-col items-stretch justify-between gap-2 text-sm text-secondary md:flex-row md:items-center">
              <span>
                Página {lista.data.page} de {lista.data.totalPages} ·{' '}
                {lista.data.total} leads
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={lista.data.page <= 1}
                  onClick={() =>
                    setFiltros((f) => ({ ...f, page: (f.page ?? 1) - 1 }))
                  }
                  fullWidthOnMobile
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={lista.data.page >= lista.data.totalPages}
                  onClick={() =>
                    setFiltros((f) => ({ ...f, page: (f.page ?? 1) + 1 }))
                  }
                  fullWidthOnMobile
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {puedeCrear && (
        <Fab icon={Plus} ariaLabel="Nuevo lead" onClick={abrirNuevo} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editLead ? 'Editar lead' : 'Nuevo lead'}
        size="lg"
      >
        <LeadForm lead={editLead} onSuccess={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!borrarLead}
        title="Eliminar lead"
        message={`¿Seguro que quieres eliminar el lead de ${borrarLead?.nombre}? Esta acción se puede revertir desde la base de datos (soft delete).`}
        danger
        loading={eliminar.isPending}
        onConfirm={confirmarBorrar}
        onCancel={() => setBorrarLead(null)}
      />
    </>
  );
}
