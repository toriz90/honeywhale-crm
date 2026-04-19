import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
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

export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(esquema) });

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
        <p className="mb-6 text-sm text-secondary">
          Ingresa tus credenciales para acceder al panel.
        </p>
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
      </div>
    </div>
  );
}
