import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Waves } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, mensajeDeError, unwrap } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { TokenPair } from '@/types/auth';

const esquema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type FormValues = z.infer<typeof esquema>;

const mensajesError: Record<string, string> = {
  google_no_autorizado:
    'Este correo de Google no está autorizado en el CRM. Contacta al administrador para que te dé de alta.',
  google_desactivado:
    'El inicio de sesión con Google no está disponible en este momento.',
};

export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [googleHabilitado, setGoogleHabilitado] = useState(false);
  const from =
    (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(esquema) });

  useEffect(() => {
    let cancelado = false;
    unwrap<{ habilitado: boolean }>(
      api.get('/configuracion/google-habilitado'),
    )
      .then((res) => {
        if (!cancelado) setGoogleHabilitado(res.habilitado);
      })
      .catch(() => {
        if (!cancelado) setGoogleHabilitado(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const pair = await unwrap<TokenPair>(api.post('/auth/login', values));
      setSession(pair);
      toast.success(`Bienvenido, ${pair.usuario.nombre}`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(mensajeDeError(err, 'Credenciales inválidas'));
    }
  });

  const iniciarGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const codigoError = searchParams.get('error');
  const mensajeError = codigoError ? mensajesError[codigoError] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-elev p-6 shadow-lg">
        <div className="mb-6 flex items-center gap-2">
          <Waves className="h-6 w-6 text-accent" />
          <span className="text-lg font-semibold text-primary">
            HoneyWhale CRM
          </span>
        </div>
        <h1 className="mb-1 text-xl font-semibold text-primary">
          Iniciar sesión
        </h1>
        <p className="mb-4 text-sm text-secondary">
          Ingresa tus credenciales para acceder al panel.
        </p>
        {mensajeError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {mensajeError}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Button type="submit" loading={isSubmitting} className="mt-2">
            Entrar
          </Button>
        </form>
        {googleHabilitado && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase text-secondary">o</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={iniciarGoogle}
            >
              <GoogleIcon />
              Continuar con Google
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 48 48"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}
