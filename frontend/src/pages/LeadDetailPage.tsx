import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Select } from '@/components/ui/Select';
import { useActualizarLead, useLead } from '@/hooks/useLeads';
import { useUsuariosAsignables } from '@/hooks/useUsuarios';
import { useWoocommercePublico } from '@/hooks/useConfiguracion';
import { LeadForm } from '@/components/leads/LeadForm';
import { ETAPA_LABELS, EtapaLead } from '@/types/lead';
import { formatFecha, formatMoneda } from '@/lib/utils';
import { mensajeDeError } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useLead(id);
  const asignables = useUsuariosAsignables(['AGENTE', 'SUPERVISOR']);
  const actualizar = useActualizarLead();
  const wcPublico = useWoocommercePublico();
  const usuario = useAuthStore((s) => s.usuario);
  const puedeReasignar =
    usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

  const opcionesAsignables = [
    { value: '', label: 'Sin asignar' },
    ...(asignables.data ?? []).map((u) => ({
      value: u.id,
      label: `${u.nombre} (${u.rol})`,
    })),
  ];

  const onChangeAsignado = async (nuevoId: string) => {
    if (!data) return;
    try {
      await actualizar.mutateAsync({
        id: data.id,
        payload: { asignado_a_id: nuevoId ? nuevoId : null },
      });
      toast.success('Asignación actualizada');
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo reasignar el lead'));
    }
  };

  const mostrarBloqueWC =
    !!data &&
    data.origen === 'WOOCOMMERCE' &&
    !!data.orden_woo_id &&
    !!wcPublico.data?.url;

  const enlaceWC =
    mostrarBloqueWC && wcPublico.data?.url
      ? `${wcPublico.data.url.replace(/\/+$/, '')}/wp-admin/post.php?post=${data.orden_woo_id}&action=edit`
      : null;

  return (
    <>
      <Topbar
        titulo="Detalle del lead"
        acciones={
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        }
      />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    {data.nombre}
                  </h2>
                  <p className="text-sm text-secondary">{data.producto}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tono="accent">
                    {ETAPA_LABELS[data.etapa as EtapaLead]}
                  </Badge>
                  <span className="text-lg font-semibold text-accent">
                    {formatMoneda(data.monto, data.moneda)}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <span className="text-secondary">Email: </span>
                  <span className="text-primary">{data.email ?? '—'}</span>
                </div>
                <div>
                  <span className="text-secondary">Teléfono: </span>
                  <span className="text-primary">{data.telefono}</span>
                </div>
                <div>
                  <span className="text-secondary">Asignado a: </span>
                  <span className="text-primary">
                    {data.asignadoA?.nombre ?? 'Sin asignar'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary">Creado: </span>
                  <span className="text-primary">
                    {formatFecha(data.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-secondary">Origen: </span>
                  <span className="text-primary">{data.origen}</span>
                </div>
              </div>

              {puedeReasignar && (
                <div className="mt-4 max-w-sm">
                  <Select
                    label="Reasignar a"
                    value={data.asignado_a_id ?? ''}
                    onChange={(e) => onChangeAsignado(e.target.value)}
                    options={opcionesAsignables}
                    disabled={asignables.isLoading || actualizar.isPending}
                  />
                </div>
              )}
            </Card>

            {mostrarBloqueWC && enlaceWC && (
              <Card
                title={`Pedido WooCommerce #${data.orden_woo_id}`}
                description="Este lead fue importado automáticamente desde la tienda."
              >
                <a
                  href={enlaceWC}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir pedido en WooCommerce
                </a>
              </Card>
            )}

            <Card title="Editar lead">
              <LeadForm lead={data} />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
