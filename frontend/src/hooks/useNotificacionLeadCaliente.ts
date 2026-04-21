import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useStatsTemperatura } from '@/hooks/useLeads';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificacionesStore } from '@/stores/notificacionesStore';
import { reproducirDing } from '@/utils/sounds';

const TITULO_BASE = 'HoneyWhale CRM';

export function useNotificacionLeadCaliente() {
  const usuario = useAuthStore((s) => s.usuario);
  const sonidoActivo = useNotificacionesStore((s) => s.sonidoActivo);
  const { data } = useStatsTemperatura();
  const previoRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    const count = data.calientes.count;
    const previo = previoRef.current;

    // Primera carga: solo anotamos el baseline, no avisamos aunque haya calientes.
    if (previo === null) {
      previoRef.current = count;
      actualizarTitulo(count);
      return;
    }

    if (count > previo && usuario) {
      if (sonidoActivo) reproducirDing();
      toast.success('🔥 Nuevo lead caliente disponible');
    }
    previoRef.current = count;
    actualizarTitulo(count);
  }, [data, sonidoActivo, usuario]);

  useEffect(() => {
    return () => {
      document.title = TITULO_BASE;
    };
  }, []);
}

function actualizarTitulo(count: number): void {
  if (typeof document === 'undefined') return;
  document.title = count > 0 ? `(${count}) ${TITULO_BASE}` : TITULO_BASE;
}
