import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfiguracionUI } from '@/types/configuracion';
import {
  useActualizarConfiguracion,
  useEnviarCorreoPrueba,
} from '@/hooks/useConfiguracion';
import { mensajeDeError } from '@/lib/api';
import { BotonProbarSmtp } from './BotonProbarSmtp';

const esquema = z.object({
  smtp_host: z.string().max(180).optional().or(z.literal('')),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_secure: z.boolean(),
  smtp_user: z.string().max(180).optional().or(z.literal('')),
  smtp_password: z.string().max(200).optional().or(z.literal('')),
  smtp_from_email: z
    .string()
    .email('Email inválido')
    .max(180)
    .optional()
    .or(z.literal('')),
  smtp_from_nombre: z.string().max(120).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof esquema>;

interface SmtpFormProps {
  configuracion: ConfiguracionUI;
}

export function SmtpForm({ configuracion }: SmtpFormProps) {
  const actualizar = useActualizarConfiguracion();
  const enviarPrueba = useEnviarCorreoPrueba();
  const [modalPrueba, setModalPrueba] = useState(false);
  const [destinatario, setDestinatario] = useState('');

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
      smtp_host: configuracion.smtp_host ?? '',
      smtp_port: configuracion.smtp_port ?? 587,
      smtp_secure: configuracion.smtp_secure,
      smtp_user: configuracion.smtp_user ?? '',
      smtp_password: '',
      smtp_from_email: configuracion.smtp_from_email ?? '',
      smtp_from_nombre: configuracion.smtp_from_nombre ?? '',
    },
  });

  const smtpSecure = watch('smtp_secure');

  const passwordPlaceholder = configuracion.tieneSmtpPassword
    ? '•••••••• (dejar vacío para no cambiar)'
    : 'Pegar aquí la contraseña de aplicación de Google';

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      smtp_host: values.smtp_host || null,
      smtp_port: values.smtp_port,
      smtp_secure: values.smtp_secure,
      smtp_user: values.smtp_user || null,
      smtp_from_email: values.smtp_from_email || null,
      smtp_from_nombre: values.smtp_from_nombre || null,
      ...(values.smtp_password ? { smtp_password: values.smtp_password } : {}),
    };
    try {
      await actualizar.mutateAsync(payload);
      toast.success('Configuración SMTP guardada');
      reset({ ...values, smtp_password: '' });
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la configuración'));
    }
  });

  const enviarCorreo = async () => {
    try {
      const res = await enviarPrueba.mutateAsync(destinatario);
      if (res.ok) {
        toast.success(`Correo enviado (${res.messageId ?? 'ok'})`);
        setModalPrueba(false);
        setDestinatario('');
      } else {
        toast.error(res.error ?? 'No se pudo enviar el correo');
      }
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo enviar el correo'));
    }
  };

  return (
    <>
      <Card
        title="Servidor de correo (SMTP)"
        description="Credenciales para enviar correos desde el CRM. La contraseña se guarda cifrada."
      >
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Host SMTP"
            placeholder="smtp.gmail.com"
            {...register('smtp_host')}
            error={errors.smtp_host?.message}
          />
          <Input
            label="Puerto"
            type="number"
            {...register('smtp_port')}
            error={errors.smtp_port?.message}
          />
          <div className="md:col-span-2">
            <Switch
              id="smtp_secure"
              checked={smtpSecure}
              onChange={(v) => setValue('smtp_secure', v, { shouldDirty: true })}
              label="Usar TLS/SSL (secure)"
              description="Activar en puerto 465. En 587 normalmente se deja desactivado (STARTTLS)."
            />
          </div>
          <Input
            label="Usuario"
            placeholder="correo@honeywhale.com"
            {...register('smtp_user')}
            error={errors.smtp_user?.message}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder={passwordPlaceholder}
            autoComplete="new-password"
            {...register('smtp_password')}
            error={errors.smtp_password?.message}
            hint={
              <>
                ¿Cómo generar una contraseña de aplicación de Google?{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  myaccount.google.com/apppasswords
                </a>
              </>
            }
          />
          <Input
            label="Remitente (email)"
            type="email"
            placeholder="no-reply@honeywhale.com"
            {...register('smtp_from_email')}
            error={errors.smtp_from_email?.message}
          />
          <Input
            label="Remitente (nombre)"
            placeholder="HoneyWhale CRM"
            {...register('smtp_from_nombre')}
            error={errors.smtp_from_nombre?.message}
          />
          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2">
            <BotonProbarSmtp />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalPrueba(true)}
            >
              <Send className="h-4 w-4" />
              Enviar correo de prueba
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>

      <Modal
        open={modalPrueba}
        onClose={() => setModalPrueba(false)}
        title="Enviar correo de prueba"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalPrueba(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={enviarCorreo}
              loading={enviarPrueba.isPending}
              disabled={!destinatario}
            >
              Enviar
            </Button>
          </div>
        }
      >
        <Input
          label="Destinatario"
          type="email"
          placeholder="destinatario@ejemplo.com"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
        />
      </Modal>
    </>
  );
}
