export type Temperatura =
  | 'caliente'
  | 'tibio'
  | 'templado'
  | 'enfriandose'
  | 'frio'
  | 'congelado';

export const ORDEN_TEMPERATURA: Record<Temperatura, number> = {
  caliente: 0,
  tibio: 1,
  templado: 2,
  enfriandose: 3,
  frio: 4,
  congelado: 5,
};

export interface EstiloTemperatura {
  bg: string;
  text: string;
  border: string;
  pulse: boolean;
  opacity: number;
  emoji: string;
  label: string;
}

function toDate(fecha: Date | string | null | undefined): Date | null {
  if (!fecha) return null;
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function calcularTemperatura(
  fechaPedido: Date | string | null | undefined,
): Temperatura {
  const d = toDate(fechaPedido);
  if (!d) return 'congelado';
  const minutos = (Date.now() - d.getTime()) / 60_000;
  if (minutos < 15) return 'caliente';
  if (minutos < 60) return 'tibio';
  if (minutos < 180) return 'templado';
  if (minutos < 1440) return 'enfriandose';
  if (minutos < 10080) return 'frio';
  return 'congelado';
}

function formatearEspera(minutos: number): string {
  const m = Math.max(0, Math.floor(minutos));
  if (m < 60) return `${m} min`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    return `${h} ${h === 1 ? 'hora' : 'h'}`;
  }
  const dias = Math.floor(m / 1440);
  return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export function textoTemperatura(
  t: Temperatura,
  fechaPedido: Date | string | null | undefined,
): string {
  const estilo = estiloTemperatura(t);
  const d = toDate(fechaPedido);
  if (!d) return `${estilo.emoji} ${estilo.label}`;
  const minutos = (Date.now() - d.getTime()) / 60_000;
  return `${estilo.emoji} ${estilo.label} · ${formatearEspera(minutos)}`;
}

/**
 * Versión ultra compacta del tiempo transcurrido para badges pequeños.
 * Sin espacios, sin palabras: "6min", "21h", "3d".
 */
export function tiempoCompacto(
  fechaPedido: Date | string | null | undefined,
): string {
  const d = toDate(fechaPedido);
  if (!d) return '—';
  const min = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60_000));
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 60) return `${h}h`;
  const dias = Math.floor(min / 1440);
  return `${dias}d`;
}

const ESTILOS: Record<Temperatura, EstiloTemperatura> = {
  caliente: {
    bg: '#ff6b35',
    text: '#ffffff',
    border: '2px solid #ff6b35',
    pulse: true,
    opacity: 1,
    emoji: '🔥',
    label: 'CALIENTE',
  },
  tibio: {
    bg: '#f57c00',
    text: '#ffffff',
    border: '1px solid #f57c00',
    pulse: false,
    opacity: 1,
    emoji: '🌶️',
    label: 'TIBIO',
  },
  templado: {
    bg: '#ffc107',
    text: '#1f2328',
    border: 'none',
    pulse: false,
    opacity: 1,
    emoji: '☀️',
    label: 'TEMPLADO',
  },
  enfriandose: {
    bg: '#64b5f6',
    text: '#ffffff',
    border: 'none',
    pulse: false,
    opacity: 1,
    emoji: '🌤️',
    label: 'ENFRIÁNDOSE',
  },
  frio: {
    bg: '#90a4ae',
    text: '#ffffff',
    border: 'none',
    pulse: false,
    opacity: 0.85,
    emoji: '❄️',
    label: 'FRÍO',
  },
  congelado: {
    bg: '#cfd8dc',
    text: '#37474f',
    border: 'none',
    pulse: false,
    opacity: 0.7,
    emoji: '🧊',
    label: 'CONGELADO',
  },
};

export function estiloTemperatura(t: Temperatura): EstiloTemperatura {
  return ESTILOS[t];
}
