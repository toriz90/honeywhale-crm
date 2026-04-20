import { useMemo, useState } from 'react';
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

interface NotasWc {
  estado_wc?: string;
  fecha_pedido?: string;
  moneda?: string;
  items?: number;
}

const ESTADO_WC_LABEL: Record<string, string> = {
  pending: 'Pago pendiente',
  cancelled: 'Cancelado',
  failed: 'Fallido',
  'on-hold': 'En espera',
  processing: 'Procesando',
  completed: 'Completado',
  refunded: 'Reembolsado',
};

function parsearNotasWc(lead: Lead | null | undefined): NotasWc | null {
  if (!lead || lead.origen !== 'WOOCOMMERCE') return null;
  const raw = lead.notas?.trim();
  if (!raw || raw[0] !== '{') return null;
  try {
    const obj = JSON.parse(raw) as NotasWc;
    if (typeof obj !== 'object' || obj === null) return null;
    // Sólo consideramos notas "WC" si al menos uno de los campos esperados
    // está presente — así una nota manual que empiece con '{' no cuenta.
    if (
      obj.estado_wc === undefined &&
      obj.fecha_pedido === undefined &&
      obj.moneda === undefined &&
      obj.items === undefined
    ) {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}

function formatearFechaPedido(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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

  const notasWc = useMemo(() => parsearNotasWc(lead ?? null), [lead]);
  const [mostrarJsonRaw, setMostrarJsonRaw] = useState(false);

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
      notas: notasWc ? '' : (lead?.notas ?? ''),
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
    // Cuando hay notas WC y el agente no escribió nada, excluimos `notas`
    // del payload para no pisar el JSON con string vacío. Si escribió algo,
    // reemplaza el JSON por texto plano (sin vuelta atrás).
    const notasFinal = notasWc
      ? values.notas && values.notas.length > 0
        ? values.notas
        : undefined
      : values.notas || undefined;

    const payload = {
      ...values,
      email: values.email || undefined,
      orden_woo_id: values.orden_woo_id || undefined,
      motivo_abandono: values.motivo_abandono || undefined,
      asignado_a_id: values.asignado_a_id ? values.asignado_a_id : null,
      notas: notasFinal,
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
        {notasWc ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-elev-2 p-3 text-sm">
              <div className="mb-2 text-xs font-medium uppercase text-secondary">
                Datos del pedido en WooCommerce
              </div>
              <dl className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <dt className="text-xs text-secondary">
                    Estado en WooCommerce
                  </dt>
                  <dd className="text-primary">
                    {notasWc.estado_wc
                      ? (ESTADO_WC_LABEL[notasWc.estado_wc] ??
                        notasWc.estado_wc)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Fecha del pedido</dt>
                  <dd className="text-primary">
                    {formatearFechaPedido(notasWc.fecha_pedido)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Moneda</dt>
                  <dd className="text-primary">{notasWc.moneda ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-secondary">Productos en pedido</dt>
                  <dd className="text-primary">
                    {typeof notasWc.items === 'number' ? notasWc.items : '—'}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => setMostrarJsonRaw((v) => !v)}
                className="mt-3 text-xs text-accent hover:underline"
              >
                {mostrarJsonRaw ? 'Ocultar' : 'Ver'} notas raw (JSON)
              </button>
              {mostrarJsonRaw && (
                <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border bg-elev p-2 text-xs text-secondary">
                  {lead?.notas ?? ''}
                </pre>
              )}
            </div>
            <Textarea
              label="Agregar notas del agente"
              placeholder="Escribe aquí cualquier nota adicional. Al guardar, reemplazarás el bloque JSON del pedido por tu texto."
              {...register('notas')}
              error={errors.notas?.message}
            />
          </div>
        ) : (
          <Textarea
            label="Notas"
            {...register('notas')}
            error={errors.notas?.message}
          />
        )}
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {lead ? 'Guardar cambios' : 'Crear lead'}
        </Button>
      </div>
    </form>
  );
}
