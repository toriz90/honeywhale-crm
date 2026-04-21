import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { ConfiguracionUI } from '@/types/configuracion';
import { useActualizarMarca } from '@/hooks/useConfiguracion';
import { mensajeDeError } from '@/lib/api';

const esquema = z.object({
  nombreTienda: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'Máximo 120 caracteres'),
  telefonoTienda: z
    .string()
    .min(5, 'Mínimo 5 caracteres')
    .max(40, 'Máximo 40 caracteres'),
  emailContacto: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Email inválido')
    .max(255, 'Máximo 255 caracteres'),
  direccionTienda: z
    .string()
    .max(255, 'Máximo 255 caracteres')
    .optional()
    .or(z.literal('')),
  rfcTienda: z
    .string()
    .max(20, 'Máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  // URL opcional: si está vacía, ok. Si tiene contenido, debe ser URL válida.
  logoUrl: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof esquema>;

interface MarcaFormProps {
  configuracion: ConfiguracionUI;
}

export function MarcaForm({ configuracion }: MarcaFormProps) {
  const actualizar = useActualizarMarca();

  const valoresIniciales: FormValues = {
    nombreTienda: configuracion.nombre_tienda ?? '',
    telefonoTienda: configuracion.telefono_tienda ?? '',
    emailContacto: configuracion.email_contacto ?? '',
    direccionTienda: configuracion.direccion_tienda ?? '',
    rfcTienda: configuracion.rfc_tienda ?? '',
    logoUrl: configuracion.logo_url ?? '',
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciales,
  });

  // Si la config llega/cambia después del primer render, sincronizamos el form.
  useEffect(() => {
    reset(valoresIniciales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    configuracion.nombre_tienda,
    configuracion.telefono_tienda,
    configuracion.email_contacto,
    configuracion.direccion_tienda,
    configuracion.rfc_tienda,
    configuracion.logo_url,
  ]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      nombreTienda: values.nombreTienda.trim(),
      telefonoTienda: values.telefonoTienda.trim(),
      emailContacto: values.emailContacto.trim(),
      direccionTienda: values.direccionTienda?.trim() || undefined,
      rfcTienda: values.rfcTienda?.trim() || undefined,
      logoUrl: values.logoUrl?.trim() || undefined,
    };
    try {
      await actualizar.mutateAsync(payload);
      toast.success('Datos de marca guardados');
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al guardar los datos de marca'));
    }
  });

  return (
    <Card
      title="Marca / Empresa"
      description="Datos públicos que aparecen en los correos y la firma de tu marca. Se aplican a TODOS los correos futuros."
    >
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <Input
          label="Nombre de la tienda"
          placeholder="HoneyWhale"
          {...register('nombreTienda')}
          error={errors.nombreTienda?.message}
        />
        <Input
          label="Teléfono de contacto"
          placeholder="+52 55 3069 2957"
          {...register('telefonoTienda')}
          error={errors.telefonoTienda?.message}
          hint="Aparece en los correos de recuperación como teléfono de contacto."
        />
        <Input
          label="Email de contacto"
          type="email"
          placeholder="hola@honeywhale.com.mx"
          {...register('emailContacto')}
          error={errors.emailContacto?.message}
        />
        <Input
          label="RFC (opcional)"
          placeholder="HWH123456ABC"
          {...register('rfcTienda')}
          error={errors.rfcTienda?.message}
        />
        <div className="md:col-span-2">
          <Textarea
            label="Dirección (opcional)"
            placeholder="Calle, número, colonia, CP, ciudad"
            rows={2}
            {...register('direccionTienda')}
            error={errors.direccionTienda?.message}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            label="URL del logo (opcional)"
            type="url"
            placeholder="https://honeywhale.com.mx/logo.png"
            {...register('logoUrl')}
            error={errors.logoUrl?.message}
            hint="Imagen pública. Si la dejas vacía, los correos no incluyen logo."
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button
            type="submit"
            loading={isSubmitting || actualizar.isPending}
            disabled={isSubmitting || actualizar.isPending}
            fullWidthOnMobile
          >
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}
