import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlugZap, RefreshCw, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfiguracionUI } from '@/types/configuracion';
import {
  useActualizarConfiguracion,
  useProbarWoocommerce,
  useRepararLeadsWoocommerce,
  useSyncWoocommerce,
} from '@/hooks/useConfiguracion';
import { mensajeDeError } from '@/lib/api';
import { formatFecha } from '@/lib/utils';

const esquema = z.object({
  woocommerce_habilitado: z.boolean(),
  woocommerce_url: z
    .string()
    .max(255)
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
  woocommerce_consumer_key: z.string().max(255).optional().or(z.literal('')),
  woocommerce_consumer_secret: z.string().max(500).optional().or(z.literal('')),
  woocommerce_webhook_secret: z.string().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof esquema>;

interface WoocommerceFormProps {
  configuracion: ConfiguracionUI;
}

type ResumenResultado = {
  titulo: string;
  total: number;
  exito: number;
  labelExito: string;
  labelNeutral: string;
  neutral: number;
  errores: { pedidoId?: string | number; mensaje: string }[];
};

export function WoocommerceForm({ configuracion }: WoocommerceFormProps) {
  const actualizar = useActualizarConfiguracion();
  const probar = useProbarWoocommerce();
  const sync = useSyncWoocommerce();
  const reparar = useRepararLeadsWoocommerce();
  const [resultadoModal, setResultadoModal] = useState<ResumenResultado | null>(
    null,
  );
  const [guiaAbierta, setGuiaAbierta] = useState(false);

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
      woocommerce_habilitado: configuracion.woocommerce_habilitado,
      woocommerce_url: configuracion.woocommerce_url ?? '',
      woocommerce_consumer_key: configuracion.woocommerce_consumer_key ?? '',
      woocommerce_consumer_secret: '',
      woocommerce_webhook_secret: '',
    },
  });

  const habilitado = watch('woocommerce_habilitado');

  const consumerSecretPlaceholder = configuracion.tieneWoocommerceConsumerSecret
    ? '•••••••• (dejar vacío para no cambiar)'
    : 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  const webhookSecretPlaceholder = configuracion.tieneWoocommerceWebhookSecret
    ? '•••••••• (dejar vacío para no cambiar)'
    : 'Genera un secret fuerte (mínimo 32 caracteres)';

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      woocommerce_habilitado: values.woocommerce_habilitado,
      woocommerce_url: values.woocommerce_url || null,
      woocommerce_consumer_key: values.woocommerce_consumer_key || null,
      ...(values.woocommerce_consumer_secret
        ? { woocommerce_consumer_secret: values.woocommerce_consumer_secret }
        : {}),
      ...(values.woocommerce_webhook_secret
        ? { woocommerce_webhook_secret: values.woocommerce_webhook_secret }
        : {}),
    };
    try {
      await actualizar.mutateAsync(payload);
      toast.success('Configuración de WooCommerce guardada');
      reset({
        ...values,
        woocommerce_consumer_secret: '',
        woocommerce_webhook_secret: '',
      });
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar la configuración'));
    }
  });

  const probarConexion = async () => {
    try {
      const res = await probar.mutateAsync();
      if (res.ok) {
        toast.success(
          `Conexión exitosa${res.version ? ` (WC ${res.version})` : ''}`,
        );
      } else {
        toast.error(res.mensaje || 'No se pudo conectar con WooCommerce');
      }
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al probar la conexión'));
    }
  };

  const sincronizar = async () => {
    try {
      const res = await sync.mutateAsync();
      setResultadoModal({
        titulo: 'Resultado de la sincronización',
        total: res.total,
        exito: res.creados,
        labelExito: 'Creados',
        neutral: res.ignorados,
        labelNeutral: 'Ignorados',
        errores: res.errores,
      });
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al sincronizar pedidos'));
    }
  };

  const repararLeads = async () => {
    try {
      const res = await reparar.mutateAsync();
      setResultadoModal({
        titulo: 'Resultado de la reparación',
        total: res.total,
        exito: res.reparados,
        labelExito: 'Reparados',
        neutral: res.sinCambios,
        labelNeutral: 'Sin cambios',
        errores: res.errores,
      });
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al reparar leads'));
    }
  };

  return (
    <>
      <Card
        title="Integración WooCommerce (conectar tienda)"
        description="Importa automáticamente los pedidos abandonados de tu tienda WooCommerce. Los secrets se guardan cifrados."
      >
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <Switch
              id="woocommerce_habilitado"
              checked={habilitado}
              onChange={(v) =>
                setValue('woocommerce_habilitado', v, { shouldDirty: true })
              }
              label="Habilitar integración con WooCommerce"
              description="Al desactivar, el polling se detiene y los webhooks responden 503."
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="URL de la tienda"
              placeholder="https://mitienda.com"
              {...register('woocommerce_url')}
              error={errors.woocommerce_url?.message}
              hint="Sin slash final. Debe tener REST API de WooCommerce habilitada."
            />
          </div>
          <Input
            label="Consumer Key"
            placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            {...register('woocommerce_consumer_key')}
            error={errors.woocommerce_consumer_key?.message}
          />
          <Input
            label="Consumer Secret"
            type="password"
            placeholder={consumerSecretPlaceholder}
            autoComplete="new-password"
            {...register('woocommerce_consumer_secret')}
            error={errors.woocommerce_consumer_secret?.message}
          />
          <div className="md:col-span-2">
            <Input
              label="Webhook Secret"
              type="password"
              placeholder={webhookSecretPlaceholder}
              autoComplete="new-password"
              {...register('woocommerce_webhook_secret')}
              error={errors.woocommerce_webhook_secret?.message}
              hint={
                <>
                  Genera un secret fuerte (por ejemplo con{' '}
                  <a
                    href="https://randomkeygen.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    randomkeygen.com
                  </a>
                  ) y úsalo también al crear los webhooks en WooCommerce.
                </>
              }
            />
          </div>
          <div className="md:col-span-2 rounded-md border border-border bg-elev-2 px-3 py-2 text-sm text-secondary">
            <span>Última sincronización: </span>
            <span className="text-primary">
              {configuracion.woocommerce_ultima_sync
                ? formatFecha(configuracion.woocommerce_ultima_sync)
                : 'Nunca'}
            </span>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setGuiaAbierta((v) => !v)}
              className="text-xs text-accent hover:underline"
            >
              {guiaAbierta ? 'Ocultar' : 'Ver'} guía paso a paso para generar
              credenciales y webhooks
            </button>
            {guiaAbierta && (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-secondary">
                <li>
                  En WordPress: WooCommerce → Ajustes → Avanzado → API REST →{' '}
                  <strong className="text-primary">Añadir clave</strong>.
                  Permisos: <em>Lectura</em>. Copia Consumer Key y Consumer
                  Secret aquí.
                </li>
                <li>
                  Para webhooks: WooCommerce → Ajustes → Avanzado → Webhooks →{' '}
                  <strong className="text-primary">Añadir webhook</strong>.
                  Crea dos webhooks, uno con topic{' '}
                  <code className="text-accent">Order created</code> y otro con{' '}
                  <code className="text-accent">Order updated</code>. URL:{' '}
                  <code className="text-accent">
                    https://crm.victortoriz.cc/api/webhooks/woocommerce
                  </code>
                  . Secret: el mismo Webhook Secret de arriba. Versión: WP REST
                  API Integration v3.
                </li>
                <li>
                  Guarda los cambios aquí y pulsa <em>Probar conexión</em>.
                </li>
              </ol>
            )}
          </div>

          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={probarConexion}
                loading={probar.isPending}
                fullWidthOnMobile
              >
                <PlugZap className="h-4 w-4" />
                Probar conexión
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={sincronizar}
                loading={sync.isPending}
                fullWidthOnMobile
              >
                <RefreshCw className="h-4 w-4" />
                Forzar sincronización ahora
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={repararLeads}
                loading={reparar.isPending}
                fullWidthOnMobile
              >
                <Wrench className="h-4 w-4" />
                Reparar datos de leads existentes
              </Button>
              <Button type="submit" loading={isSubmitting} fullWidthOnMobile>
                Guardar cambios
              </Button>
            </div>
            <p className="text-right text-xs text-secondary">
              Reconsulta los pedidos en WooCommerce y actualiza
              nombre/producto/teléfono de los leads existentes. Útil después de
              cambiar el mapeo. No toca etapa ni notas del agente.
            </p>
          </div>
        </form>
      </Card>

      <Modal
        open={!!resultadoModal}
        onClose={() => setResultadoModal(null)}
        title={resultadoModal?.titulo ?? 'Resultado'}
        size="md"
        footer={
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setResultadoModal(null)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {resultadoModal && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-elev-2 p-3 text-center">
                <div className="text-xs text-secondary">Total revisados</div>
                <div className="mt-1 text-lg font-semibold text-primary">
                  {resultadoModal.total}
                </div>
              </div>
              <div className="rounded-md border border-border bg-elev-2 p-3 text-center">
                <div className="text-xs text-secondary">
                  {resultadoModal.labelExito}
                </div>
                <div className="mt-1 text-lg font-semibold text-accent">
                  {resultadoModal.exito}
                </div>
              </div>
              <div className="rounded-md border border-border bg-elev-2 p-3 text-center">
                <div className="text-xs text-secondary">
                  {resultadoModal.labelNeutral}
                </div>
                <div className="mt-1 text-lg font-semibold text-primary">
                  {resultadoModal.neutral}
                </div>
              </div>
            </div>
            {resultadoModal.errores.length > 0 && (
              <div>
                <div className="mb-1 text-xs text-danger">
                  Errores ({resultadoModal.errores.length}):
                </div>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-elev-2 p-2 text-xs text-secondary">
                  {resultadoModal.errores.map((e, i) => (
                    <li key={i}>
                      {e.pedidoId ? `#${e.pedidoId}: ` : ''}
                      {e.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
