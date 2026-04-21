import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface NotificacionesState {
  sonidoActivo: boolean;
  toggleSonido: () => void;
  setSonidoActivo: (v: boolean) => void;
}

export const useNotificacionesStore = create<NotificacionesState>()(
  persist(
    (set, get) => ({
      sonidoActivo: true,
      toggleSonido: () => set({ sonidoActivo: !get().sonidoActivo }),
      setSonidoActivo: (v) => set({ sonidoActivo: v }),
    }),
    {
      name: 'hw-notificaciones',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
