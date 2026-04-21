import { Bell, BellOff } from 'lucide-react';
import { useNotificacionesStore } from '@/stores/notificacionesStore';

export function SonidoToggle() {
  const sonidoActivo = useNotificacionesStore((s) => s.sonidoActivo);
  const toggle = useNotificacionesStore((s) => s.toggleSonido);

  const Icono = sonidoActivo ? Bell : BellOff;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={sonidoActivo ? 'Silenciar notificaciones' : 'Activar notificaciones'}
      title={
        sonidoActivo
          ? 'Notificaciones sonoras activas'
          : 'Notificaciones sonoras silenciadas'
      }
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-elev text-secondary transition-colors hover:bg-elev-2 hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <Icono className="h-4 w-4" />
    </button>
  );
}
