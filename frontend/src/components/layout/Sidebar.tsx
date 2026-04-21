import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Settings,
  LogOut,
  Waves,
  Archive,
  X,
  UsersRound,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { Rol } from '@/types/auth';

interface Item {
  to: string;
  label: string;
  Icono: typeof LayoutDashboard;
  roles?: Rol[];
}

interface Grupo {
  titulo: string;
  items: Item[];
}

const grupos: Grupo[] = [
  {
    titulo: 'Principal',
    items: [{ to: '/dashboard', label: 'Dashboard', Icono: LayoutDashboard }],
  },
  {
    titulo: 'Gestión',
    items: [
      { to: '/leads', label: 'Leads', Icono: Kanban },
      {
        to: '/equipo',
        label: 'Equipo',
        Icono: UsersRound,
        roles: ['AGENTE'],
      },
      {
        to: '/archivados',
        label: 'Archivados',
        Icono: Archive,
        roles: ['ADMIN', 'SUPERVISOR'],
      },
      { to: '/usuarios', label: 'Usuarios', Icono: Users, roles: ['ADMIN'] },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      {
        to: '/configuracion',
        label: 'Configuración',
        Icono: Settings,
        roles: ['ADMIN'],
      },
    ],
  },
];

interface SidebarProps {
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}

export function Sidebar({ drawerOpen, onCloseDrawer }: SidebarProps) {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const cerrarSesion = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const puedeVer = (roles?: Rol[]) =>
    !roles || (usuario && roles.includes(usuario.rol));

  return (
    <>
      <div
        onClick={onCloseDrawer}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-border bg-elev transition-transform duration-200 md:sticky md:top-0 md:w-[72px] md:translate-x-0 lg:w-60',
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4 md:px-3 md:py-3 lg:px-4 lg:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Waves className="h-5 w-5 shrink-0 text-accent" />
            <span className="font-semibold text-primary md:hidden lg:inline">
              HoneyWhale CRM
            </span>
          </div>
          <button
            onClick={onCloseDrawer}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-elev-2 hover:text-primary md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {grupos.map((g) => {
            const visibles = g.items.filter((i) => puedeVer(i.roles));
            if (visibles.length === 0) return null;
            return (
              <div key={g.titulo} className="mb-4">
                <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-secondary md:hidden lg:block">
                  {g.titulo}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {visibles.map(({ to, label, Icono }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        title={label}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-2 rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors md:justify-center md:px-2 lg:justify-start lg:px-3',
                            isActive
                              ? 'border-accent bg-elev-2 text-primary'
                              : 'border-transparent text-secondary hover:bg-elev-2 hover:text-primary',
                          )
                        }
                      >
                        <Icono className="h-5 w-5 shrink-0 md:h-5 md:w-5 lg:h-4 lg:w-4" />
                        <span className="md:hidden lg:inline">{label}</span>
                        <span
                          className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md border border-border bg-elev px-2 py-1 text-xs text-primary shadow-md md:group-hover:block lg:group-hover:hidden"
                        >
                          {label}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-border px-2 py-3">
          <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-secondary md:hidden lg:block">
            Cuenta
          </div>
          <div className="px-3 py-2 text-sm md:hidden lg:block">
            <div className="truncate font-medium text-primary">
              {usuario?.nombre}
            </div>
            <div className="text-xs text-secondary">{usuario?.rol}</div>
          </div>
          <button
            onClick={cerrarSesion}
            title="Cerrar sesión"
            className="group relative flex w-full items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm text-secondary hover:bg-elev-2 hover:text-primary md:justify-center md:px-2 lg:justify-start lg:px-3"
          >
            <LogOut className="h-5 w-5 shrink-0 lg:h-4 lg:w-4" />
            <span className="md:hidden lg:inline">Cerrar sesión</span>
            <span className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md border border-border bg-elev px-2 py-1 text-xs text-primary shadow-md md:group-hover:block lg:group-hover:hidden">
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
