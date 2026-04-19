import { ETAPAS, ETAPA_LABELS, FiltrosLeads } from '@/types/lead';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface LeadFiltersProps {
  filtros: FiltrosLeads;
  onChange: (f: FiltrosLeads) => void;
}

export function LeadFilters({ filtros, onChange }: LeadFiltersProps) {
  const setFiltro = <K extends keyof FiltrosLeads>(
    k: K,
    v: FiltrosLeads[K] | '',
  ) => {
    const nuevos: FiltrosLeads = { ...filtros, page: 1 };
    if (v === '' || v === undefined) {
      delete nuevos[k];
    } else {
      nuevos[k] = v as FiltrosLeads[K];
    }
    onChange(nuevos);
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <Input
        placeholder="Buscar por nombre, email, teléfono o producto..."
        value={filtros.search ?? ''}
        onChange={(e) => setFiltro('search', e.target.value)}
      />
      <Select
        value={filtros.etapa ?? ''}
        onChange={(e) => setFiltro('etapa', e.target.value as FiltrosLeads['etapa'] | '')}
        options={[
          { value: '', label: 'Todas las etapas' },
          ...ETAPAS.map((e) => ({ value: e, label: ETAPA_LABELS[e] })),
        ]}
      />
      <Select
        value={filtros.orderBy ?? 'created_at'}
        onChange={(e) => setFiltro('orderBy', e.target.value)}
        options={[
          { value: 'created_at', label: 'Más recientes' },
          { value: 'updated_at', label: 'Actualizados' },
          { value: 'monto', label: 'Monto' },
          { value: 'nombre', label: 'Nombre' },
        ]}
      />
      <Select
        value={filtros.order ?? 'DESC'}
        onChange={(e) => setFiltro('order', e.target.value as 'ASC' | 'DESC')}
        options={[
          { value: 'DESC', label: 'Descendente' },
          { value: 'ASC', label: 'Ascendente' },
        ]}
      />
    </div>
  );
}
