import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Mail, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Fab } from '@/components/ui/Fab';
import { mensajeDeError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  useCrearPlantilla,
  useEliminarPlantilla,
  usePlantillas,
} from '@/hooks/usePlantillas';
import {
  CATEGORIAS,
  CATEGORIA_LABELS,
  CategoriaPlantilla,
  Plantilla,
  TEMPERATURAS_DISPONIBLES,
  TemperaturaPlantilla,
} from '@/types/plantilla';
import { PlantillaFormModal } from '@/components/plantillas/PlantillaFormModal';

const COLOR_CATEGORIA: Record<CategoriaPlantilla, string> = {
  RECORDATORIO: 'bg-blue-500/15 text-blue-500 border border-blue-500/40',
  DESCUENTO: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/40',
  URGENCIA: 'bg-amber-500/15 text-amber-500 border border-amber-500/40',
  PERSONAL: 'bg-purple-500/15 text-purple-500 border border-purple-500/40',
  OTRO: 'bg-elev-2 text-secondary border border-border',
};

const EMOJI_TEMP: Record<TemperaturaPlantilla, string> = {
  caliente: '🔥',
  tibio: '🌶️',
  templado: '☀️',
  enfriandose: '🌤️',
  frio: '❄️',
  congelado: '🧊',
};

export function PlantillasPage() {
  const usuario = useAuthStore((s) => s.usuario);
  const esAdmin = usuario?.rol === 'ADMIN';

  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaPlantilla | ''>('');
  const [filtroTemperatura, setFiltroTemperatura] = useState<TemperaturaPlantilla | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editar, setEditar] = useState<Plantilla | null>(null);
  const [borrar, setBorrar] = useState<Plantilla | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const { data, isLoading } = usePlantillas({
    categoria: filtroCategoria || undefined,
    temperatura: filtroTemperatura || undefined,
  });
  const eliminar = useEliminarPlantilla();
  const crear = useCrearPlantilla();

  const filtradas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q),
    );
  }, [data, busqueda]);

  const abrirNueva = () => {
    setEditar(null);
    setModalAbierto(true);
  };

  const abrirEditar = (p: Plantilla) => {
    setEditar(p);
    setModalAbierto(true);
    setMenuAbierto(null);
  };

  const onDuplicar = async (p: Plantilla) => {
    setMenuAbierto(null);
    try {
      await crear.mutateAsync({
        nombre: `${p.nombre} (copia)`,
        descripcion: p.descripcion ?? undefined,
        asunto: p.asunto,
        cuerpo_html: p.cuerpo_html,
        cuerpo_texto: p.cuerpo_texto ?? undefined,
        categoria: p.categoria,
        temperaturas_recomendadas: p.temperaturas_recomendadas ?? undefined,
        activa: p.activa,
      });
      toast.success('Plantilla duplicada');
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo duplicar'));
    }
  };

  const confirmarBorrar = async () => {
    if (!borrar) return;
    try {
      await eliminar.mutateAsync(borrar.id);
      toast.success('Plantilla eliminada');
      setBorrar(null);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo eliminar'));
    }
  };

  return (
    <>
      <Topbar
        titulo="Plantillas de correo"
        acciones={
          <Button onClick={abrirNueva}>
            <Plus className="h-4 w-4" />
            Nueva plantilla
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="pl-9"
            />
          </div>
          <Select
            value={filtroCategoria}
            onChange={(e) =>
              setFiltroCategoria(e.target.value as CategoriaPlantilla | '')
            }
            options={[
              { value: '', label: 'Todas las categorías' },
              ...CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABELS[c] })),
            ]}
          />
          <Select
            value={filtroTemperatura}
            onChange={(e) =>
              setFiltroTemperatura(e.target.value as TemperaturaPlantilla | '')
            }
            options={[
              { value: '', label: 'Todas las temperaturas' },
              ...TEMPERATURAS_DISPONIBLES.map((t) => ({
                value: t,
                label: `${EMOJI_TEMP[t]} ${t}`,
              })),
            ]}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-12 text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-secondary" />
            <p className="text-sm text-secondary">
              No hay plantillas con esos filtros.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={abrirNueva}
            >
              Crear primera plantilla
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtradas.map((p) => (
              <CardPlantilla
                key={p.id}
                plantilla={p}
                onClick={() => abrirEditar(p)}
                menuAbierto={menuAbierto === p.id}
                onToggleMenu={(abrir) =>
                  setMenuAbierto(abrir ? p.id : null)
                }
                onEditar={() => abrirEditar(p)}
                onDuplicar={() => onDuplicar(p)}
                onEliminar={esAdmin ? () => setBorrar(p) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <Fab icon={Plus} ariaLabel="Nueva plantilla" onClick={abrirNueva} />

      <PlantillaFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        plantilla={editar}
      />

      <ConfirmDialog
        open={!!borrar}
        title="Eliminar plantilla"
        message={`¿Eliminar "${borrar?.nombre}"? Los correos ya enviados con esta plantilla seguirán en el historial.`}
        danger
        loading={eliminar.isPending}
        onConfirm={confirmarBorrar}
        onCancel={() => setBorrar(null)}
      />
    </>
  );
}

interface CardPlantillaProps {
  plantilla: Plantilla;
  onClick: () => void;
  menuAbierto: boolean;
  onToggleMenu: (abrir: boolean) => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onEliminar?: () => void;
}

function CardPlantilla({
  plantilla,
  onClick,
  menuAbierto,
  onToggleMenu,
  onEditar,
  onDuplicar,
  onEliminar,
}: CardPlantillaProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border bg-elev p-4 transition-colors',
        'hover:border-accent',
        !plantilla.activa && 'opacity-60',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 flex-1 text-sm font-semibold text-primary">
          {plantilla.nombre}
        </h3>
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onToggleMenu(!menuAbierto)}
            className="flex h-7 w-7 items-center justify-center rounded text-secondary hover:bg-elev-2 hover:text-primary"
            aria-label="Acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuAbierto && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => onToggleMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-md border border-border bg-elev shadow-lg">
                <button
                  type="button"
                  onClick={onEditar}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-elev-2"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={onDuplicar}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-elev-2"
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </button>
                {onEliminar && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMenu(false);
                      onEliminar();
                    }}
                    className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            COLOR_CATEGORIA[plantilla.categoria],
          )}
        >
          {CATEGORIA_LABELS[plantilla.categoria]}
        </span>
        {(plantilla.temperaturas_recomendadas ?? []).map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-0.5 rounded-full bg-elev-2 px-1.5 py-0.5 text-[10px] text-secondary"
            title={t}
          >
            {EMOJI_TEMP[t]} {t}
          </span>
        ))}
        {!plantilla.activa && (
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-secondary">
            inactiva
          </span>
        )}
      </div>

      <p className="mb-3 line-clamp-2 text-xs text-secondary">
        {plantilla.descripcion || plantilla.asunto}
      </p>

      <div className="flex items-center justify-between text-[11px] text-secondary">
        <span>Usada {plantilla.veces_usada} veces</span>
        <span className="truncate text-right">{plantilla.creadoPor?.nombre ?? ''}</span>
      </div>
    </div>
  );
}
