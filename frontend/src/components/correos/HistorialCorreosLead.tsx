import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { formatFecha } from '@/lib/utils';
import { useCorreosPorLead } from '@/hooks/useCorreos';
import {
  CorreoEnviado,
  ESTADO_CORREO_LABELS,
  EstadoCorreo,
} from '@/types/correo';

interface HistorialCorreosLeadProps {
  leadId: string;
}

const COLOR_ESTADO: Record<EstadoCorreo, string> = {
  ENVIADO: 'bg-success/15 text-success border border-success/40',
  FALLIDO: 'bg-danger/15 text-danger border border-danger/40',
  BORRADOR: 'bg-elev-2 text-secondary border border-border',
  PENDIENTE: 'bg-warning/15 text-warning border border-warning/40',
};

export function HistorialCorreosLead({ leadId }: HistorialCorreosLeadProps) {
  const { data, isLoading } = useCorreosPorLead(leadId, true);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-secondary">
        Aún no se ha enviado ningún correo a este lead.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((c) => (
        <ItemHistorial key={c.id} correo={c} />
      ))}
    </ul>
  );
}

function ItemHistorial({ correo }: { correo: CorreoEnviado }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="rounded-md border border-border bg-elev">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        {abierto ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="line-clamp-1 flex-1 text-sm font-medium text-primary">
              {correo.asunto_final}
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                COLOR_ESTADO[correo.estado],
              )}
              title={
                correo.estado === 'FALLIDO' && correo.error_envio
                  ? correo.error_envio
                  : undefined
              }
            >
              {ESTADO_CORREO_LABELS[correo.estado]}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-secondary">
            <span>
              {correo.fecha_envio
                ? formatFecha(correo.fecha_envio)
                : formatFecha(correo.created_at)}
            </span>
            {correo.usuario && <span>· {correo.usuario.nombre}</span>}
            {correo.plantilla && (
              <span className="truncate">· {correo.plantilla.nombre}</span>
            )}
          </div>
          {correo.estado === 'FALLIDO' && correo.error_envio && (
            <div className="mt-1 flex items-start gap-1 text-[11px] text-danger">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{correo.error_envio}</span>
            </div>
          )}
        </div>
      </button>
      {abierto && (
        <div className="border-t border-border bg-elev-2 p-2">
          <CuerpoCorreoIframe html={correo.cuerpo_html_final} />
        </div>
      )}
    </li>
  );
}

function CuerpoCorreoIframe({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html || '<p style="color:#888;font-family:system-ui;">(vacío)</p>');
    doc.close();
  }, [html]);
  return (
    <iframe
      ref={ref}
      title="Cuerpo del correo"
      sandbox=""
      className="h-80 w-full rounded border border-border bg-white"
    />
  );
}
