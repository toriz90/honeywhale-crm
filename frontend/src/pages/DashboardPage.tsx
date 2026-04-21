import {
  TrendingUp,
  PiggyBank,
  Users,
  Target,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { useDashboard } from '@/hooks/useDashboard';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { EtapaChart } from '@/components/dashboard/EtapaChart';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoneda } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { ReporteMensual } from '@/components/dashboard/ReporteMensual';

export function DashboardPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const { data, isLoading } = useDashboard();
  const puedeVerTopAgentes =
    usuario?.rol === 'ADMIN' || usuario?.rol === 'SUPERVISOR';

  return (
    <>
      <Topbar titulo="Dashboard" />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {isLoading || !data ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                titulo="Total leads"
                valor={data.totalLeads}
                Icono={Users}
              />
              <KpiCard
                titulo="Recuperado"
                valor={formatMoneda(data.montoTotalRecuperado)}
                Icono={PiggyBank}
              />
              <KpiCard
                titulo="En negociación"
                valor={formatMoneda(data.montoEnNegociacion)}
                Icono={TrendingUp}
              />
              <KpiCard
                titulo="Tasa de recuperación"
                valor={`${data.tasaRecuperacion}%`}
                descripcion="RECUPERADO / (RECUPERADO + PERDIDO)"
                Icono={Target}
              />
              <KpiCard
                titulo="Asignados a mí"
                valor={data.leadsAsignadosAMi}
                Icono={Sparkles}
              />
              <KpiCard
                titulo="Nuevos hoy"
                valor={data.leadsNuevosHoy}
                Icono={Clock}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EtapaChart data={data.leadsPorEtapa} />
              {puedeVerTopAgentes && (
                <Card title="Top agentes">
                  {data.topAgentes.length === 0 ? (
                    <p className="text-sm text-secondary">
                      Todavía no hay leads recuperados.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-secondary">
                          <th className="pb-2">Agente</th>
                          <th className="pb-2 text-right">Recuperados</th>
                          <th className="pb-2 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topAgentes.map((a) => (
                          <tr
                            key={a.usuarioId}
                            className="border-t border-border"
                          >
                            <td className="py-2 text-primary">{a.nombre}</td>
                            <td className="py-2 text-right text-secondary">
                              {a.recuperados}
                            </td>
                            <td className="py-2 text-right text-accent">
                              {formatMoneda(a.montoRecuperado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              )}
            </div>
            {puedeVerTopAgentes && (
              <div className="border-t border-border pt-4">
                <ReporteMensual />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
