import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ETAPAS, ETAPA_LABELS, Lead } from '@/types/lead';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useCrearLead, useActualizarLead } from '@/hooks/useLeads';
import { useUsuariosAsignables } from '@/hooks/useUsuarios';
import { mensajeDeError } from '@/lib/api';

const esquema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(150),
  email: z
    .string()
    .email('Email inválido')
    .max(180)
    .optional()
    .or(z.literal('')),
  telefono: z.string().min(1, 'El teléfono es obligatorio').max(30),
  producto: z.string().min(1, 'El producto es obligatorio').max(200),
  monto: z.coerce.number().min(0, 'El monto no puede ser negativo'),
  moneda: z.enum(['MXN', 'USD']),
  etapa: z.enum([
    'NUEVO',
    'CONTACTADO',
    'EN_NEGOCIACION',
    'OFERTA_ENVIADA',
    'RECUPERADO',
    'PERDIDO',
  ]),
  orden_woo_id: z.string().max(60).optional().or(z.literal('')),
  motivo_abandono: z.string().max(255).optional().or(z.literal('')),
  asignado_a_id: z.string().optional().or(z.literal('')),
  notas: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof esquema>;

interface LeadFormProps {
  lead?: Lead | null;
  onSuccess?: () => void;
}

export function LeadForm({ lead, onSuccess }: LeadFormProps) {
  const crear = useCrearLead();
  const actualizar = useActualizarLead();
  const asignables = useUsuariosAsignables(['AGENTE', 'SUPERVISOR']);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: lead?.nombre ?? '',
      email: lead?.email ?? '',
      telefono: lead?.telefono ?? '',
      producto: lead?.producto ?? '',
      monto: lead ? Number(lead.monto) : 0,
      moneda: lead?.moneda ?? 'MXN',
      etapa: lead?.etapa ?? 'NUEVO',
      orden_woo_id: lead?.orden_woo_id ?? '',
      motivo_abandono: lead?.motivo_abandono ?? '',
      asignado_a_id: lead?.asignado_a_id ?? '',
      notas: lead?.notas ?? '',
    },
  });

  const opcionesAsignables = [
    { value: '', label: 'Sin asignar' },
    ...(asignables.data ?? []).map((u) => ({
      value: u.id,
      label: `${u.nombre} (${u.rol})`,
    })),
  ];

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      ...values,
      email: values.email || undefined,
      orden_woo_id: values.orden_woo_id || undefined,
      motivo_abandono: values.motivo_abandono || undefined,
      asignado_a_id: values.asignado_a_id ? values.asignado_a_id : null,
      notas: values.notas || undefined,
    };
    try {
      if (lead) {
        await actualizar.mutateAsync({ id: lead.id, payload });
        toast.success('Lead actualizado');
      } else {
        await crear.mutateAsync(payload);
        toast.success('Lead creado');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar el lead'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} />
      <Input
        label="Email"
        type="email"
        {...register('email')}
        error={errors.email?.message}
      />
      <Input
        label="Teléfono"
        {...register('telefono')}
        error={errors.telefono?.message}
      />
      <Input
        label="Producto"
        {...register('producto')}
        error={errors.producto?.message}
      />
      <Input
        label="Monto"
        type="number"
        step="0.01"
        {...register('monto')}
        error={errors.monto?.message}
      />
      <Select
        label="Moneda"
        {...register('moneda')}
        options={[
          { value: 'MXN', label: 'MXN' },
          { value: 'USD', label: 'USD' },
        ]}
        error={errors.moneda?.message}
      />
      <Select
        label="Etapa"
        {...register('etapa')}
        options={ETAPAS.map((e) => ({ value: e, label: ETAPA_LABELS[e] }))}
        error={errors.etapa?.message}
      />
      <Input
        label="ID de orden WooCommerce"
        {...register('orden_woo_id')}
        error={errors.orden_woo_id?.message}
      />
      <Select
        label="Asignar a"
        {...register('asignado_a_id')}
        options={opcionesAsignables}
        error={errors.asignado_a_id?.message}
        disabled={asignables.isLoading}
      />
      <div className="md:col-span-2">
        <Input
          label="Motivo de abandono"
          {...register('motivo_abandono')}
          error={errors.motivo_abandono?.message}
        />
      </div>
      <div className="md:col-span-2">
        <Textarea label="Notas" {...register('notas')} error={errors.notas?.message} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {lead ? 'Guardar cambios' : 'Crear lead'}
        </Button>
      </div>
    </form>
  );
}
