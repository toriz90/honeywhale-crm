import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TokenPair, UsuarioAuth } from '@/types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  usuario: UsuarioAuth | null;
  setSession: (pair: TokenPair) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      usuario: null,
      setSession: (pair) =>
        set({
          accessToken: pair.accessToken,
          refreshToken: pair.refreshToken,
          usuario: pair.usuario,
        }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, usuario: null }),
      isAuthenticated: () => !!get().accessToken && !!get().usuario,
    }),
    {
      name: 'hw_crm_auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
