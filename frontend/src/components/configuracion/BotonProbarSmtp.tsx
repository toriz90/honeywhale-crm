import { PlugZap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { useProbarSmtp } from '@/hooks/useConfiguracion';
import { mensajeDeError } from '@/lib/api';

export function BotonProbarSmtp() {
  const probar = useProbarSmtp();

  const handleClick = async () => {
    try {
      const res = await probar.mutateAsync();
      if (res.ok) {
        toast.success('Conexión SMTP exitosa');
      } else {
        toast.error(res.error ?? 'No se pudo conectar al SMTP');
      }
    } catch (err) {
      toast.error(mensajeDeError(err, 'Error al probar SMTP'));
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      loading={probar.isPending}
    >
      <PlugZap className="h-4 w-4" />
      Probar conexión
    </Button>
  );
}
