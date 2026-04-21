import { FiltroAsignacion } from '@/types/lead';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';

interface FiltrosLeadsProps {
  valor: FiltroAsignacion;
  onChange: (v: FiltroAsignacion) => void;
}

interface Pill {
  valor: FiltroAsignacion;
  label: string;
  visibleParaAgente: boolean;
  visibleParaSupAdmin: boolean;
}

const PILLS: Pill[] = [
  { valor: 'mios', label: 'Míos', visibleParaAgente: true, visibleParaSupAdmin: true },
  {
    valor: 'sin_asignar',
    label: 'Sin asignar',
    visibleParaAgente: true,
    visibleParaSupAdmin: true,
  },
  { valor: 'equipo', label: 'Equipo', visibleParaAgente: true, visibleParaSupAdmin: true },
  {
    valor: 'todos',
    label: 'Todos',
    visibleParaAgente: false,
    visibleParaSupAdmin: true,
  },
];

export function FiltrosLeads({ valor, onChange }: FiltrosLeadsProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const esAgente = usuario?.rol === 'AGENTE';

  const pills = PILLS.filter((p) =>
    esAgente ? p.visibleParaAgente : p.visibleParaSupAdmin,
  );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-elev px-4 py-2 md:px-6">
      {pills.map((p) => {
        const activo = valor === p.valor;
        return (
          <button
            key={p.valor}
            type="button"
            onClick={() => onChange(p.valor)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activo
                ? 'bg-accent text-white'
                : 'bg-elev-2 text-secondary hover:text-primary',
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function filtroDefaultPara(
  rol: string | undefined,
  vistaEquipo = false,
): FiltroAsignacion {
  if (vistaEquipo) return 'equipo';
  if (rol === 'AGENTE') return 'mios';
  return 'todos';
}
