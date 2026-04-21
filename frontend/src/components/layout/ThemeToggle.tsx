import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeToggle() {
  const tema = useThemeStore((s) => s.tema);
  const toggle = useThemeStore((s) => s.toggle);

  const esOscuro = tema === 'oscuro';
  const Icono = esOscuro ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema"
      title={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-elev text-secondary transition-all duration-200 hover:bg-elev-2 hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <Icono className="h-4 w-4 transition-transform duration-200" />
    </button>
  );
}
