import { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SonidoToggle } from './SonidoToggle';
import { useSidebar } from './sidebarContext';

interface TopbarProps {
  titulo: string;
  acciones?: ReactNode;
  accionesMobile?: ReactNode;
}

export function Topbar({ titulo, acciones, accionesMobile }: TopbarProps) {
  const { openDrawer } = useSidebar();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-elev px-4 md:h-16 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Abrir menú"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-elev-2 hover:text-primary md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-primary md:text-lg">
          {titulo}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1 md:hidden">
          {accionesMobile}
        </div>
        <div className="hidden items-center gap-2 md:flex">{acciones}</div>
        <SonidoToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
