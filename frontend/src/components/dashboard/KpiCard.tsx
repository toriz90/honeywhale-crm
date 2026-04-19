import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface KpiCardProps {
  titulo: string;
  valor: ReactNode;
  descripcion?: string;
  Icono?: LucideIcon;
}

export function KpiCard({ titulo, valor, descripcion, Icono }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">
          {titulo}
        </span>
        {Icono && <Icono className="h-4 w-4 text-accent" />}
      </div>
      <div className="mt-2 text-2xl font-semibold text-primary">{valor}</div>
      {descripcion && (
        <div className="mt-1 text-xs text-secondary">{descripcion}</div>
      )}
    </Card>
  );
}
