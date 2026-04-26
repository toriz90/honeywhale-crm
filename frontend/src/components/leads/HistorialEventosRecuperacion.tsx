import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useEventosRecuperacion } from '@/hooks/useRecuperacion';
import {
  EventoRecuperacion,
  SenalRecuperacion,
  TipoEventoRecuperacion,
} from '@/types/recuperacion';
import { formatFecha } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HistorialEventosRecuperacionProps {
  leadId: string;
  etapa: string;
}

export function HistorialEventosRecuperacion({
  leadId,
  etapa,
}: HistorialEventosRecuperacionProps) {
  const [expandido, setExpandido] = useState(false);
  const eventos = useEventosRecuperacion(leadId, expandido);

  if (etapa !== 'RECUPERADO') return null;

  const total = eventos.data?.length ?? 0;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expandido}
      >
        <span className="flex items-center gap-2 text-base font-semibold text-primary">
          <Clock className="h-4 w-4 text-secondary" />
          Historial de atribución
        </span>
        <span className="flex items-center gap-1 text-sm text-secondary">
          {expandido && eventos.isLoading
            ? 'Cargando...'
            : expandido && total > 0
              ? `${total} ${total === 1 ? 'evento' : 'eventos'}`
              : expandido
                ? '0 eventos'
                : 'Ver historial'}
          {expandido ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {expandido && (
        <div className="mt-4">
          {eventos.isLoading ? (
            <div className="flex items-center justify-center py-4 text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : eventos.isError ? (
            <p className="py-2 text-sm text-danger">
              No se pudo cargar el historial
            </p>
          ) : total === 0 ? (
            <p className="py-2 text-sm text-secondary">
              Sin eventos registrados
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {eventos.data!.map((ev) => (
                <li key={ev.id}>
                  <EventoItem evento={ev} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

const TIPO_LABEL: Record<TipoEventoRecuperacion, string> = {
  AUTO_RECUPERADO: 'Recuperación automática',
  AUTO_ORGANICO: 'Compra orgánica',
  MANUAL_RECUPERADO: 'Recuperación manual',
  REVERSION: 'Cambio manual',
};

const TIPO_CLASE: Record<TipoEventoRecuperacion, string> = {
  AUTO_RECUPERADO:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  AUTO_ORGANICO:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  MANUAL_RECUPERADO:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  REVERSION:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const SENAL_LABEL: Record<SenalRecuperacion, string> = {
  asignado: 'Agente asignado',
  etapa_cambiada: 'Etapa cambiada',
  correo_enviado: 'Correo enviado',
};

function EventoItem({ evento }: { evento: EventoRecuperacion }) {
  const auto = Boolean(evento.decididoAutomaticamente);
  const decisor = auto
    ? 'Sistema'
    : (evento.decididoPor?.nombre ?? 'Usuario desconocido');
  const senales = evento.senalesDetectadas ?? [];

  return (
    <div className="rounded-md border border-border bg-elev-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
            TIPO_CLASE[evento.tipo],
          )}
        >
          {TIPO_LABEL[evento.tipo]}
        </span>
        <span
          className="text-xs text-secondary"
          title={formatFecha(evento.createdAt)}
        >
          {tiempoRelativo(evento.createdAt)}
        </span>
      </div>

      <p className="mt-2 text-sm text-primary">
        <span className="text-secondary">Decidido por:</span> {decisor}
        {evento.asignadoA?.nombre && (
          <>
            <span className="text-secondary"> · Agente al momento:</span>{' '}
            {evento.asignadoA.nombre}
          </>
        )}
      </p>

      {senales.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {senales.map((s) => (
            <span
              key={s}
              className="inline-flex items-center rounded-md border border-border bg-elev px-1.5 py-0.5 text-[11px] text-secondary"
            >
              {SENAL_LABEL[s] ?? s}
            </span>
          ))}
        </div>
      )}

      {evento.notas && (
        <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic text-secondary">
          {evento.notas}
        </blockquote>
      )}
    </div>
  );
}

function tiempoRelativo(iso: string): string {
  const ahora = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diffSeg = Math.round((ahora - t) / 1000);
  if (diffSeg < 60) return 'hace unos segundos';
  const diffMin = Math.round(diffSeg / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `hace ${diffD} ${diffD === 1 ? 'día' : 'días'}`;
  const diffM = Math.round(diffD / 30);
  if (diffM < 12) return `hace ${diffM} ${diffM === 1 ? 'mes' : 'meses'}`;
  const diffY = Math.round(diffD / 365);
  return `hace ${diffY} ${diffY === 1 ? 'año' : 'años'}`;
}
