import { useStatsTemperatura } from '@/hooks/useLeads';
import { formatMoneda } from '@/lib/utils';

export function BannerCalientes() {
  const { data } = useStatsTemperatura();

  if (!data) return null;
  const calientes = data.calientes.count;
  const tibios = data.tibios.count;

  if (calientes === 0 && tibios === 0) return null;

  const montoPotencial =
    data.calientes.montoTotal + data.tibios.montoTotal;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-sm font-medium md:px-6"
      style={{
        background:
          'linear-gradient(90deg, rgba(255,107,53,0.18) 0%, rgba(245,124,0,0.12) 100%)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span aria-hidden>⚡</span>
        <span>
          Tienes{' '}
          {calientes > 0 && (
            <>
              <strong>{calientes}</strong> leads 🔥 CALIENTES
            </>
          )}
          {calientes > 0 && tibios > 0 && ' + '}
          {tibios > 0 && (
            <>
              <strong>{tibios}</strong> 🌶️ TIBIOS
            </>
          )}{' '}
          sin tomar
        </span>
      </div>
      <span className="text-secondary">
        · {formatMoneda(montoPotencial)} potencial
      </span>
    </div>
  );
}
