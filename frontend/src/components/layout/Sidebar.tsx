import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Settings,
  LogOut,
  Waves,
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

export function Sidebar() {
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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-elev">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Waves className="h-5 w-5 text-accent" />
        <span className="font-semibold text-primary">HoneyWhale CRM</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {grupos.map((g) => {
          const visibles = g.items.filter((i) => puedeVer(i.roles));
          if (visibles.length === 0) return null;
          return (
            <div key={g.titulo} className="mb-4">
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                {g.titulo}
              </div>
              <ul className="flex flex-col gap-0.5">
                {visibles.map(({ to, label, Icono }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'border-accent bg-elev-2 text-primary'
                            : 'border-transparent text-secondary hover:bg-elev-2 hover:text-primary',
                        )
                      }
                    >
                      <Icono className="h-4 w-4" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border px-2 py-3">
        <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
          Cuenta
        </div>
        <div className="px-3 py-2 text-sm">
          <div className="font-medium text-primary">{usuario?.nombre}</div>
          <div className="text-xs text-secondary">{usuario?.rol}</div>
        </div>
        <button
          onClick={cerrarSesion}
          className="flex w-full items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2 text-sm text-secondary hover:bg-elev-2 hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
