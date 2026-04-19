import { ReactElement, useEffect } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { Rol } from '@/types/auth';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LeadsPage } from '@/pages/LeadsPage';
import { LeadDetailPage } from '@/pages/LeadDetailPage';
import { UsuariosPage } from '@/pages/UsuariosPage';
import { ConfiguracionPage } from '@/pages/ConfiguracionPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function RequiereAuth({ children }: { children: ReactElement }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequiereRol({
  roles,
  children,
}: {
  roles: Rol[];
  children: ReactElement;
}) {
  const usuario = useAuthStore((s) => s.usuario);
  const navigate = useNavigate();
  const tienePermiso = !!usuario && roles.includes(usuario.rol);

  useEffect(() => {
    if (usuario && !tienePermiso) {
      toast.error('No tienes permisos para esta sección');
      navigate('/dashboard', { replace: true });
    }
  }, [usuario, tienePermiso, navigate]);

  if (!tienePermiso) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function HomeRedirect() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  return <Navigate to={isAuth ? '/dashboard' : '/login'} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequiereAuth>
            <Layout />
          </RequiereAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route
          path="/usuarios"
          element={
            <RequiereRol roles={['ADMIN']}>
              <UsuariosPage />
            </RequiereRol>
          }
        />
        <Route
          path="/configuracion"
          element={
            <RequiereRol roles={['ADMIN']}>
              <ConfiguracionPage />
            </RequiereRol>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
