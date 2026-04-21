import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { mensajeDeError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CATEGORIAS,
  CATEGORIA_LABELS,
  CategoriaPlantilla,
  CrearPlantillaPayload,
  PLACEHOLDERS_DISPONIBLES,
  Plantilla,
  TEMPERATURAS_DISPONIBLES,
  TemperaturaPlantilla,
} from '@/types/plantilla';
import {
  useActualizarPlantilla,
  useCrearPlantilla,
} from '@/hooks/usePlantillas';
import { EditorCodeMirror, EditorHandle } from './EditorCodeMirror';

interface PlantillaFormModalProps {
  open: boolean;
  onClose: () => void;
  plantilla: Plantilla | null;
  onSuccess?: () => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  asunto: string;
  cuerpo_html: string;
  cuerpo_texto: string;
  categoria: CategoriaPlantilla;
  temperaturas: TemperaturaPlantilla[];
  activa: boolean;
}

const VACIO: FormState = {
  nombre: '',
  descripcion: '',
  asunto: '',
  cuerpo_html: '',
  cuerpo_texto: '',
  categoria: 'OTRO',
  temperaturas: [],
  activa: true,
};

type CampoActivo = 'asunto' | 'cuerpo_html' | null;

export function PlantillaFormModal({
  open,
  onClose,
  plantilla,
  onSuccess,
}: PlantillaFormModalProps) {
  const editando = !!plantilla;
  const [form, setForm] = useState<FormState>(VACIO);
  const [campoActivo, setCampoActivo] = useState<CampoActivo>('asunto');
  const asuntoRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorHandle>(null);

  const crear = useCrearPlantilla();
  const actualizar = useActualizarPlantilla();
  const guardando = crear.isPending || actualizar.isPending;

  // Inicializa el form al abrir / al cambiar plantilla.
  useEffect(() => {
    if (!open) return;
    if (plantilla) {
      setForm({
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion ?? '',
        asunto: plantilla.asunto,
        cuerpo_html: plantilla.cuerpo_html,
        cuerpo_texto: plantilla.cuerpo_texto ?? '',
        categoria: plantilla.categoria,
        temperaturas: plantilla.temperaturas_recomendadas ?? [],
        activa: plantilla.activa,
      });
    } else {
      setForm(VACIO);
    }
    setCampoActivo('asunto');
  }, [open, plantilla]);

  const insertarPlaceholder = (key: string) => {
    const token = `{{${key}}}`;
    if (campoActivo === 'cuerpo_html') {
      editorRef.current?.insertarTexto(token);
      return;
    }
    // Default: asunto.
    const input = asuntoRef.current;
    if (!input) {
      setForm((f) => ({ ...f, asunto: f.asunto + token }));
      return;
    }
    const start = input.selectionStart ?? form.asunto.length;
    const end = input.selectionEnd ?? form.asunto.length;
    const nuevoValor =
      form.asunto.slice(0, start) + token + form.asunto.slice(end);
    setForm((f) => ({ ...f, asunto: nuevoValor }));
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + token.length;
      input.setSelectionRange(pos, pos);
    });
  };

  const toggleTemperatura = (t: TemperaturaPlantilla) => {
    setForm((f) => {
      const ya = f.temperaturas.includes(t);
      return {
        ...f,
        temperaturas: ya
          ? f.temperaturas.filter((x) => x !== t)
          : [...f.temperaturas, t],
      };
    });
  };

  const validar = (): string | null => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio';
    if (!form.asunto.trim()) return 'El asunto es obligatorio';
    if (!form.cuerpo_html.trim()) return 'El cuerpo HTML es obligatorio';
    return null;
  };

  const onSubmit = async () => {
    const err = validar();
    if (err) {
      toast.error(err);
      return;
    }
    const payload: CrearPlantillaPayload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      asunto: form.asunto,
      cuerpo_html: form.cuerpo_html,
      cuerpo_texto: form.cuerpo_texto.trim() || undefined,
      categoria: form.categoria,
      temperaturas_recomendadas: form.temperaturas.length
        ? form.temperaturas
        : undefined,
      activa: form.activa,
    };
    try {
      if (editando && plantilla) {
        await actualizar.mutateAsync({ id: plantilla.id, payload });
        toast.success('Plantilla actualizada');
      } else {
        await crear.mutateAsync(payload);
        toast.success('Plantilla creada');
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error(mensajeDeError(e, 'No se pudo guardar la plantilla'));
    }
  };

  const opcionesCategoria = useMemo(
    () => CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABELS[c] })),
    [],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? `Editar plantilla` : 'Nueva plantilla'}
      size="xl"
      footer={
        <div className="flex flex-col-reverse justify-end gap-2 md:flex-row">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={guardando}
            fullWidthOnMobile
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={guardando} fullWidthOnMobile>
            {editando ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Recordatorio suave (tibio)"
            maxLength={120}
          />

          <Textarea
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Cuándo conviene usar esta plantilla..."
            rows={2}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Categoría"
              value={form.categoria}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoria: e.target.value as CategoriaPlantilla,
                })
              }
              options={opcionesCategoria}
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-primary">
                Temperaturas recomendadas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPERATURAS_DISPONIBLES.map((t) => {
                  const activa = form.temperaturas.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTemperatura(t)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        activa
                          ? 'border-accent bg-accent text-white'
                          : 'border-border bg-elev-2 text-secondary hover:text-primary',
                      )}
                    >
                      {EMOJI_TEMP[t]} {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Input
            ref={asuntoRef}
            label="Asunto"
            value={form.asunto}
            onChange={(e) => setForm({ ...form, asunto: e.target.value })}
            onFocus={() => setCampoActivo('asunto')}
            placeholder="Ej. {{nombre}}, te ayudo a terminar tu compra 🛴"
            maxLength={255}
            hint="Soporta placeholders como {{nombre}}. Click en el panel para insertarlos."
          />

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                Cuerpo HTML
              </span>
              <span className="text-xs text-secondary">
                {campoActivo === 'cuerpo_html'
                  ? 'Insertando en cuerpo'
                  : 'Click el editor para insertar aquí'}
              </span>
            </div>
            <EditorCodeMirror
              ref={editorRef}
              value={form.cuerpo_html}
              onChange={(v) => setForm({ ...form, cuerpo_html: v })}
              onFocus={() => setCampoActivo('cuerpo_html')}
              height={360}
            />
          </div>

          <Textarea
            label="Cuerpo texto plano (opcional, fallback)"
            value={form.cuerpo_texto}
            onChange={(e) =>
              setForm({ ...form, cuerpo_texto: e.target.value })
            }
            placeholder="Versión sin HTML para clientes que no soportan correos enriquecidos."
            rows={3}
          />

          <Switch
            checked={form.activa}
            onChange={(v) => setForm({ ...form, activa: v })}
            label="Activa"
            description="Si está apagada, no aparece en el selector de plantillas del panel de envío."
          />
        </div>

        <PanelPlaceholders
          campoActivo={campoActivo}
          onInsertar={insertarPlaceholder}
        />
      </div>
    </Modal>
  );
}

const EMOJI_TEMP: Record<TemperaturaPlantilla, string> = {
  caliente: '🔥',
  tibio: '🌶️',
  templado: '☀️',
  enfriandose: '🌤️',
  frio: '❄️',
  congelado: '🧊',
};

interface PanelPlaceholdersProps {
  campoActivo: CampoActivo;
  onInsertar: (key: string) => void;
}

function PanelPlaceholders({ campoActivo, onInsertar }: PanelPlaceholdersProps) {
  return (
    <aside className="flex flex-col gap-2 rounded-md border border-border bg-elev-2 p-3 lg:sticky lg:top-0 lg:max-h-[70vh] lg:overflow-y-auto">
      <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Placeholders
      </div>
      <p className="text-xs text-secondary">
        Insertan en{' '}
        <span className="font-semibold text-primary">
          {campoActivo === 'cuerpo_html' ? 'el cuerpo' : 'el asunto'}
        </span>
        .
      </p>
      <div className="flex flex-col gap-1">
        {PLACEHOLDERS_DISPONIBLES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onInsertar(p.key)}
            title={p.descripcion}
            className="flex flex-col items-start rounded border border-transparent px-2 py-1.5 text-left transition-colors hover:border-accent/50 hover:bg-elev"
          >
            <code className="text-xs font-semibold text-accent">
              {`{{${p.key}}}`}
            </code>
            <span className="text-[10px] leading-tight text-secondary">
              {p.descripcion}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
