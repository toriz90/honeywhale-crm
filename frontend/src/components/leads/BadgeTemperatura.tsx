import { useEffect, useState } from 'react';
import {
  calcularTemperatura,
  estiloTemperatura,
  textoTemperatura,
} from '@/utils/temperatura';
import { cn } from '@/lib/utils';

interface BadgeTemperaturaProps {
  fechaPedido: Date | string | null | undefined;
  compacto?: boolean;
  className?: string;
}

export function BadgeTemperatura({
  fechaPedido,
  compacto,
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
  const texto = textoTemperatura(t, fechaPedido);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight',
        e.pulse && 'animate-pulse-slow',
        className,
      )}
      style={{
        background: e.bg,
        color: e.text,
        border: e.border === 'none' ? undefined : e.border,
        opacity: e.opacity,
      }}
      title={texto}
    >
      {compacto ? e.emoji : texto}
    </span>
  );
}
