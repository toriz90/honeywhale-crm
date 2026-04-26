import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Lead } from '@/types/lead';
import { useCambiarAtribucion } from '@/hooks/useRecuperacion';
import { BadgeAtribucion } from './BadgeAtribucion';
import { cn } from '@/lib/utils';

interface CambiarAtribucionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export function CambiarAtribucionModal({
  lead,
  isOpen,
  onClose,
}: CambiarAtribucionModalProps) {
  const cambiar = useCambiarAtribucion();
  const atribucionActual = lead.recuperadoPorAgente ?? null;

  // Estado inicial: lo opuesto a la actual cuando es true/false; cuando es
  // null (histórica) arrancamos en true como default razonable.
  const [seleccion, setSeleccion] = useState<boolean>(
    atribucionActual === true ? false : true,
  );
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSeleccion(atribucionActual === true ? false : true);
      setNotas('');
    }
  }, [isOpen, atribucionActual]);

  const sinCambio = atribucionActual === seleccion;

  const onGuardar = async () => {
    if (cambiar.isPending || sinCambio) return;
    try {
      await cambiar.mutateAsync({
        leadId: lead.id,
        payload: {
          recuperadoPorAgente: seleccion,
          ...(notas.trim() ? { notas: notas.trim() } : {}),
        },
      });
      onClose();
    } catch {
      // toast ya manejado en el hook
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={() => {
        if (!cambiar.isPending) onClose();
      }}
      title="Cambiar atribución de recuperación"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={cambiar.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onGuardar}
            loading={cambiar.isPending}
            disabled={sinCambio}
            title={sinCambio ? 'La selección es igual a la atribución actual' : undefined}
          >
            Guardar cambio
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-secondary">
            Atribución actual
          </p>
          <BadgeAtribucion
            recuperadoPorAgente={atribucionActual}
            etapa={lead.etapa}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs uppercase tracking-wide text-secondary">
            Nueva atribución
          </legend>

          <OpcionAtribucion
            checked={seleccion === true}
            onSelect={() => setSeleccion(true)}
            emoji="🟢"
            titulo="Recuperación con agente"
            descripcion="Un miembro del equipo trabajó el lead antes de la compra"
          />
          <OpcionAtribucion
            checked={seleccion === false}
            onSelect={() => setSeleccion(false)}
            emoji="🔵"
            titulo="Compra orgánica"
            descripcion="El cliente regresó por su cuenta, sin intervención del equipo"
          />
        </fieldset>

        <Textarea
          label="Notas (opcional)"
          value={notas}
          onChange={(e) => setNotas(e.target.value.slice(0, 500))}
          placeholder="Razón del cambio (opcional pero recomendado)..."
          rows={3}
          maxLength={500}
        />
        <div className="-mt-2 text-right text-xs text-secondary">
          {notas.length}/500
        </div>
      </div>
    </Modal>
  );
}

interface OpcionAtribucionProps {
  checked: boolean;
  onSelect: () => void;
  emoji: string;
  titulo: string;
  descripcion: string;
}

function OpcionAtribucion({
  checked,
  onSelect,
  emoji,
  titulo,
  descripcion,
}: OpcionAtribucionProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
        checked
          ? 'border-accent bg-accent/10'
          : 'border-border hover:bg-elev-2',
      )}
    >
      <input
        type="radio"
        name="atribucion"
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-[var(--accent)]"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-primary">
          <span aria-hidden className="mr-1">
            {emoji}
          </span>
          {titulo}
        </span>
        <span className="text-xs text-secondary">{descripcion}</span>
      </div>
    </label>
  );
}
