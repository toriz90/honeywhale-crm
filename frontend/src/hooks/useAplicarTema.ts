import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export function useAplicarTema(): void {
  const tema = useThemeStore((s) => s.tema);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', tema);
    root.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }, [tema]);
}
