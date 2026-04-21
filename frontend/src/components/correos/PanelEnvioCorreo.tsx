import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Loader2, Mail, Save, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { Lead } from '@/types/lead';
import {
  CATEGORIA_LABELS,
  Plantilla,
  TemperaturaPlantilla,
} from '@/types/plantilla';
import { calcularTemperatura, estiloTemperatura } from '@/utils/temperatura';
import {
  usePlantillas,
  usePreviewPlantilla,
} from '@/hooks/usePlantillas';
import {
  useEnviarCorreo,
  useGuardarBorrador,
} from '@/hooks/useCorreos';
import { EditorCodeMirror } from '@/components/plantillas/EditorCodeMirror';

interface PanelEnvioCorreoProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_TEMP: Record<TemperaturaPlantilla, string> = {
  caliente: '🔥',
  tibio: '🌶️',
  templado: '☀️',
  enfriandose: '🌤️',
  frio: '❄️',
  congelado: '🧊',
};

type TabCuerpo = 'visual' | 'html';

export function PanelEnvioCorreo({
  lead,
  isOpen,
  onClose,
}: PanelEnvioCorreoProps) {
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
  const [asunto, setAsunto] = useState('');
  const [cuerpoHtml, setCuerpoHtml] = useState('');
  const [cuerpoTexto, setCuerpoTexto] = useState('');
  const [tabCuerpo, setTabCuerpo] = useState<TabCuerpo>('visual');
  const [htmlPreviewDebounced, setHtmlPreviewDebounced] = useState('');

  // Reset al abrir / cambiar lead.
  useEffect(() => {
    if (!isOpen) return;
    setPlantillaId(null);
    setAsunto('');
    setCuerpoHtml('');
    setCuerpoTexto('');
    setTabCuerpo('visual');
  }, [isOpen, lead?.id]);

  // Cierre con Esc.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Bloquea scroll del body cuando el panel está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Debounce del cuerpo HTML para la preview (evita re-render del iframe en cada keystroke).
  useEffect(() => {
    const t = window.setTimeout(() => setHtmlPreviewDebounced(cuerpoHtml), 500);
    return () => window.clearTimeout(t);
  }, [cuerpoHtml]);

  const { data: plantillas, isLoading: cargandoPlantillas } = usePlantillas({
    activa: true,
  });

  const temperaturaActual = lead?.fecha_pedido_wc
    ? (calcularTemperatura(lead.fecha_pedido_wc) as TemperaturaPlantilla)
    : null;

  const { recomendadas, otras } = useMemo(() => {
    if (!plantillas) return { recomendadas: [], otras: [] };
    if (!temperaturaActual) return { recomendadas: [], otras: plantillas };
    const rec: Plantilla[] = [];
    const oth: Plantilla[] = [];
    for (const p of plantillas) {
      if (
        Array.isArray(p.temperaturas_recomendadas) &&
        p.temperaturas_recomendadas.includes(temperaturaActual)
      ) {
        rec.push(p);
      } else {
        oth.push(p);
      }
    }
    return { recomendadas: rec, otras: oth };
  }, [plantillas, temperaturaActual]);

  const previewQ = usePreviewPlantilla(plantillaId, lead?.id, !!plantillaId);

  // Cuando llega el preview, prerellena los campos.
  useEffect(() => {
    if (!previewQ.data) return;
    setAsunto(previewQ.data.asunto);
    setCuerpoHtml(previewQ.data.cuerpoHtml);
    setCuerpoTexto(previewQ.data.cuerpoTexto ?? '');
  }, [previewQ.data]);

  const enviar = useEnviarCorreo();
  const borrador = useGuardarBorrador();

  if (!isOpen || !lead) return null;

  const sinEmail = !lead.email;
  const puedeEnviar =
    !sinEmail && asunto.trim().length > 0 && cuerpoHtml.trim().length > 0;

  const onEnviar = async () => {
    if (!puedeEnviar) return;
    try {
      await enviar.mutateAsync({
        leadId: lead.id,
        plantillaId: plantillaId ?? undefined,
        asunto,
        cuerpoHtml,
        cuerpoTexto: cuerpoTexto.trim() || undefined,
      });
      onClose();
    } catch {
      /* toast lo maneja el hook */
    }
  };

  const onBorrador = async () => {
    if (!asunto.trim() && !cuerpoHtml.trim()) return;
    try {
      await borrador.mutateAsync({
        leadId: lead.id,
        plantillaId: plantillaId ?? undefined,
        asunto: asunto || '(sin asunto)',
        cuerpoHtml: cuerpoHtml || '<p></p>',
        cuerpoTexto: cuerpoTexto.trim() || undefined,
      });
      onClose();
    } catch {
      /* toast lo maneja el hook */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar panel"
        onClick={onClose}
        className="hidden flex-1 bg-black/60 md:block"
      />
      <aside
        className={cn(
          'flex h-full w-full flex-col border-l border-border bg-elev shadow-2xl',
          'animate-in slide-in-from-right duration-200',
          'md:w-[480px]',
        )}
      >
        <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-primary">
              <Mail className="h-4 w-4 text-accent" />
              Enviar correo a {lead.nombre}
            </h2>
            <p className="truncate text-xs text-secondary" title={lead.email ?? ''}>
              {lead.email ?? '⚠️ Sin email registrado'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-secondary hover:bg-elev-2 hover:text-primary"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {sinEmail && (
            <div className="mb-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              Este lead no tiene email — no se puede enviar correo. Edítalo y agrega un email primero.
            </div>
          )}

          <SeccionPlantilla
            cargando={cargandoPlantillas}
            recomendadas={recomendadas}
            otras={otras}
            temperatura={temperaturaActual}
            seleccionada={plantillaId}
            onSeleccionar={setPlantillaId}
          />

          {previewQ.isFetching && (
            <div className="my-2 flex items-center gap-2 text-xs text-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Renderizando preview...
            </div>
          )}

          <div className="mt-4">
            <Input
              label="Asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              maxLength={255}
              disabled={sinEmail}
            />
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">Cuerpo</span>
              <div className="flex rounded-md border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setTabCuerpo('visual')}
                  className={cn(
                    'px-2 py-1',
                    tabCuerpo === 'visual'
                      ? 'bg-elev-2 text-primary'
                      : 'text-secondary',
                  )}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => setTabCuerpo('html')}
                  className={cn(
                    'px-2 py-1',
                    tabCuerpo === 'html'
                      ? 'bg-elev-2 text-primary'
                      : 'text-secondary',
                  )}
                >
                  HTML
                </button>
              </div>
            </div>
            {tabCuerpo === 'visual' ? (
              <PreviewIframe html={htmlPreviewDebounced || cuerpoHtml} />
            ) : (
              <EditorCodeMirror
                value={cuerpoHtml}
                onChange={setCuerpoHtml}
                height={320}
              />
            )}
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border bg-elev-2 px-4 py-3 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={enviar.isPending || borrador.isPending}
            fullWidthOnMobile
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={onBorrador}
            loading={borrador.isPending}
            disabled={enviar.isPending || (!asunto && !cuerpoHtml)}
            fullWidthOnMobile
          >
            <Save className="h-4 w-4" />
            Guardar borrador
          </Button>
          <Button
            onClick={onEnviar}
            loading={enviar.isPending}
            disabled={!puedeEnviar || borrador.isPending}
            fullWidthOnMobile
          >
            <Send className="h-4 w-4" />
            Enviar ahora
          </Button>
        </footer>
      </aside>
    </div>
  );
}

interface SeccionPlantillaProps {
  cargando: boolean;
  recomendadas: Plantilla[];
  otras: Plantilla[];
  temperatura: TemperaturaPlantilla | null;
  seleccionada: string | null;
  onSeleccionar: (id: string | null) => void;
}

function SeccionPlantilla({
  cargando,
  recomendadas,
  otras,
  temperatura,
  seleccionada,
  onSeleccionar,
}: SeccionPlantillaProps) {
  if (cargando) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recomendadas.length > 0 && temperatura && (
        <div>
          <div
            className="mb-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: estiloTemperatura(temperatura).bg,
              color: estiloTemperatura(temperatura).text,
            }}
          >
            ⚡ Recomendadas para {EMOJI_TEMP[temperatura]} {temperatura}
          </div>
          <div className="space-y-1.5">
            {recomendadas.map((p) => (
              <OpcionPlantilla
                key={p.id}
                plantilla={p}
                seleccionada={seleccionada === p.id}
                onSeleccionar={() => onSeleccionar(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {otras.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-secondary">
            {recomendadas.length > 0 ? 'Otras plantillas' : 'Plantillas'}
          </div>
          <div className="space-y-1.5">
            {otras.map((p) => (
              <OpcionPlantilla
                key={p.id}
                plantilla={p}
                seleccionada={seleccionada === p.id}
                onSeleccionar={() => onSeleccionar(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onSeleccionar(null)}
        className={cn(
          'w-full rounded-md border px-3 py-2 text-left text-xs transition-colors',
          seleccionada === null
            ? 'border-accent bg-accent/10 text-primary'
            : 'border-dashed border-border text-secondary hover:border-accent/50',
        )}
      >
        ✏️ Sin plantilla (correo personalizado)
      </button>
    </div>
  );
}

function OpcionPlantilla({
  plantilla,
  seleccionada,
  onSeleccionar,
}: {
  plantilla: Plantilla;
  seleccionada: boolean;
  onSeleccionar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSeleccionar}
      className={cn(
        'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
        seleccionada
          ? 'border-accent bg-accent/10'
          : 'border-border hover:border-accent/50 hover:bg-elev-2',
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full border',
          seleccionada
            ? 'border-accent bg-accent'
            : 'border-border bg-transparent',
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-primary">
          {plantilla.nombre}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-secondary">
          {CATEGORIA_LABELS[plantilla.categoria]}
        </span>
      </span>
    </button>
  );
}

function PreviewIframe({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      html ||
        '<div style="font-family:system-ui;color:#888;padding:20px;">(sin contenido aún)</div>',
    );
    doc.close();
  }, [html]);
  return (
    <iframe
      ref={ref}
      title="Vista previa del correo"
      sandbox=""
      className="h-72 w-full rounded-md border border-border bg-white"
    />
  );
}
