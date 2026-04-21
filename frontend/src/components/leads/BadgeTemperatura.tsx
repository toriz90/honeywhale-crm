import { useEffect, useState } from 'react';
import {
  calcularTemperatura,
  estiloTemperatura,
  textoTemperatura,
  tiempoCompacto,
} from '@/utils/temperatura';
import { cn } from '@/lib/utils';

interface BadgeTemperaturaProps {
  fechaPedido: Date | string | null | undefined;
  /**
   * Default true. Versión compacta = "🔥 6min".
   * Pasa false sólo si necesitas el formato largo "🔥 CALIENTE · 6 min".
   */
  compacto?: boolean;
  className?: string;
}

export function BadgeTemperatura({
  fechaPedido,
  compacto = true,
  className,
}: BadgeTemperaturaProps) {
  // Tick de 60s para que un lead caliente pase a tibio sin refresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!fechaPedido) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [fechaPedido]);

  if (!fechaPedido) return null;

  const t = calcularTemperatura(fechaPedido);
  const e = estiloTemperatura(t);
  const tooltip = textoTemperatura(t, fechaPedido);
  const corto = tiempoCompacto(fechaPedido);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight',
        e.pulse && 'animate-pulse-slow',
        className,
      )}
      style={{
        background: e.bg,
        color: e.text,
        opacity: e.opacity,
      }}
      title={tooltip}
      aria-label={tooltip}
    >
      <span aria-hidden>{e.emoji}</span>
      {compacto ? (
        <span>{corto}</span>
      ) : (
        <span>
          {e.label} · {corto}
        </span>
      )}
    </span>
  );
}
