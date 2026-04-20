import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { Rol, UsuarioAuth } from '@/types/auth';

interface JwtPayload {
  sub: string;
  email: string;
  rol: Rol;
  nombre?: string;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payloadPart] = token.split('.');
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const completado = useRef(false);

  useEffect(() => {
    if (completado.current) return;
    completado.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      navigate('/login?error=google_desactivado', { replace: true });
      return;
    }

    const payload = decodeJwt(accessToken);
    if (!payload) {
      navigate('/login?error=google_desactivado', { replace: true });
      return;
    }

    const usuario: UsuarioAuth = {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      nombre: payload.nombre ?? payload.email,
    };

    setSession({
      accessToken,
      refreshToken,
      expiresIn: '15m',
      usuario,
    });
    navigate('/dashboard', { replace: true });
  }, [searchParams, navigate, setSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="flex flex-col items-center gap-3 text-primary">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-sm">Completando inicio de sesión…</span>
      </div>
    </div>
  );
}
