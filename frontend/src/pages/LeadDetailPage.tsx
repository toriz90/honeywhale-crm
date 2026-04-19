import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLead } from '@/hooks/useLeads';
import { LeadForm } from '@/components/leads/LeadForm';
import { ETAPA_LABELS, EtapaLead } from '@/types/lead';
import { formatFecha, formatMoneda } from '@/lib/utils';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useLead(id);

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
              </div>
            </Card>
            <Card title="Editar lead">
              <LeadForm lead={data} />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
