import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Tema = 'claro' | 'oscuro';

interface ThemeState {
  tema: Tema;
  setTema: (t: Tema) => void;
  toggle: () => void;
}

function detectarTemaInicial(): Tema {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'oscuro';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'oscuro'
    : 'claro';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      tema: detectarTemaInicial(),
      setTema: (t) => set({ tema: t }),
      toggle: () => set({ tema: get().tema === 'oscuro' ? 'claro' : 'oscuro' }),
    }),
    {
      name: 'hw-theme',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ tema: s.tema }),
    },
  ),
);
