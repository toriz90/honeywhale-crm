import { cn } from '@/lib/utils';

interface BadgeAtribucionProps {
  recuperadoPorAgente: boolean | null | undefined;
  etapa: string;
  className?: string;
}

export function BadgeAtribucion({
  recuperadoPorAgente,
  etapa,
  className,
}: BadgeAtribucionProps) {
  if (etapa !== 'RECUPERADO') return null;

  if (recuperadoPorAgente === true) {
    return (
      <span
        title="Un agente trabajó este lead antes de la compra (asignación, cambio de etapa o correo enviado)"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
          className,
        )}
      >
        <span aria-hidden>🟢</span>
        Recuperación con agente
      </span>
    );
  }

  if (recuperadoPorAgente === false) {
    return (
      <span
        title="El cliente compró sin que el equipo trabajara el lead — no cuenta como recuperación del CRM"
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
          'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
          className,
        )}
      >
        <span aria-hidden>🔵</span>
        Compra orgánica
      </span>
    );
  }

  return (
    <span
      title="Lead recuperado antes de que existiera el sistema de atribución — sin certificación"
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        className,
      )}
    >
      <span aria-hidden>⚪</span>
      Recuperación histórica
    </span>
  );
}
