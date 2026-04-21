import { useState } from 'react';
import { toast } from 'sonner';
import { Archive } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useArchivarMes,
  useFechaUltimoArchivado,
} from '@/hooks/useArchivados';
import { formatFecha } from '@/lib/utils';
import { mensajeDeError } from '@/lib/api';

function calcularMesAnterior(): { year: number; month: number } {
  const ahora = new Date();
  const prev = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
}

const NOMBRES_MES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function ArchivoMensualForm() {
  const [open, setOpen] = useState(false);
  const ultimo = useFechaUltimoArchivado();
  const archivar = useArchivarMes();

  const { year, month } = calcularMesAnterior();
  const etiqueta = `${NOMBRES_MES[month - 1]} ${year}`;

  const confirmar = async () => {
    try {
      const res = await archivar.mutateAsync({ year, month });
      toast.success(
        `Archivado completo: ${res.archivados} leads movidos a archivados.`,
      );
      setOpen(false);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo archivar el mes'));
    }
  };

  return (
    <Card
      title="Archivo mensual"
      description="Mueve los leads RECUPERADO/PERDIDO del mes a la vista de archivados. El job automático corre el día 1 a las 00:00."
    >
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between rounded-md border border-border bg-elev-2 px-3 py-2">
          <span className="text-secondary">Último archivado realizado</span>
          <span className="font-medium text-primary">
            {ultimo.isLoading
              ? '…'
              : ultimo.data?.fecha
                ? formatFecha(ultimo.data.fecha)
                : 'Nunca'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-secondary">
            Mes a archivar:{' '}
            <span className="font-medium text-primary">{etiqueta}</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => setOpen(true)}
            loading={archivar.isPending}
          >
            <Archive className="h-4 w-4" />
            Archivar mes anterior ahora
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={open}
        title="Archivar mes anterior"
        message={`Se archivarán todos los leads RECUPERADO y PERDIDO cuya última etapa cambió en ${etiqueta}. ¿Continuar?`}
        confirmText="Archivar"
        onConfirm={confirmar}
        onCancel={() => setOpen(false)}
        loading={archivar.isPending}
      />
    </Card>
  );
}
