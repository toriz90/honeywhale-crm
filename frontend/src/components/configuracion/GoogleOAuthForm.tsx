import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { ConfiguracionUI } from '@/types/configuracion';
import { useActualizarConfiguracion } from '@/hooks/useConfiguracion';
import { mensajeDeError } from '@/lib/api';

const esquema = z.object({
  google_habilitado: z.boolean(),
  google_client_id: z.string().max(255).optional().or(z.literal('')),
  google_client_secret: z.string().max(500).optional().or(z.literal('')),
  google_redirect_uri: z
    .string()
    .max(255)
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof esquema>;

interface GoogleOAuthFormProps {
  configuracion: ConfiguracionUI;
}

export function GoogleOAuthForm({ configuracion }: GoogleOAuthFormProps) {
  const actualizar = useActualizarConfiguracion();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      google_habilitado: configuracion.google_habilitado,
      google_client_id: configuracion.google_client_id ?? '',
      google_client_secret: '',
      google_redirect_uri: configuracion.google_redirect_uri ?? '',
    },
  });

  const habilitado = watch('google_habilitado');

  const secretPlaceholder = configuracion.tieneGoogleClientSecret
    ? '•••••••• (dejar vacío para no cambiar)'
    : 'Pegar aquí el client secret de Google';

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      google_habilitado: values.google_habilitado,
      google_client_id: values.google_client_id || null,
      google_redirect_uri: values.google_redirect_uri || null,
      ...(values.google_client_secret
        ? { google_client_secret: values.google_client_secret }
        : {}),
    };
    try {
      await actualizar.mutateAsync(payload);
      toast.success('Configuración de Google guardada');
      reset({ ...values, google_client_secret: '' });
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la configuración'));
    }
  });

  return (
    <Card
      title="Google OAuth (login con Google)"
      description="Credenciales para permitir que los usuarios inicien sesión con su cuenta de Google."
    >
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Switch
            id="google_habilitado"
            checked={habilitado}
            onChange={(v) =>
              setValue('google_habilitado', v, { shouldDirty: true })
            }
            label="Habilitar login con Google"
            description="Si se desactiva, los usuarios sólo podrán iniciar sesión con email y contraseña."
          />
        </div>
        <Input
          label="Client ID"
          placeholder="1234567890-xxxxxxxx.apps.googleusercontent.com"
          {...register('google_client_id')}
          error={errors.google_client_id?.message}
        />
        <Input
          label="Client Secret"
          type="password"
          placeholder={secretPlaceholder}
          autoComplete="new-password"
          {...register('google_client_secret')}
          error={errors.google_client_secret?.message}
        />
        <div className="md:col-span-2">
          <Input
            label="Redirect URI"
            placeholder="https://crm.victortoriz.cc/auth/google/callback"
            {...register('google_redirect_uri')}
            error={errors.google_redirect_uri?.message}
            hint={
              <>
                Configurar en Google Cloud Console → OAuth 2.0 Client IDs. La
                Redirect URI debe coincidir exactamente con la que autorices en
                Google (por ejemplo{' '}
                <code className="text-accent">
                  https://crm.victortoriz.cc/auth/google/callback
                </code>
                ).
              </>
            }
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" loading={isSubmitting} fullWidthOnMobile>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}
