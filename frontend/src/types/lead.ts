import { Usuario } from './usuario';

export type EtapaLead =
  | 'NUEVO'
  | 'CONTACTADO'
  | 'EN_NEGOCIACION'
  | 'OFERTA_ENVIADA'
  | 'RECUPERADO'
  | 'PERDIDO';

export type Moneda = 'MXN' | 'USD';

export const ETAPAS: EtapaLead[] = [
  'NUEVO',
  'CONTACTADO',
  'EN_NEGOCIACION',
  'OFERTA_ENVIADA',
  'RECUPERADO',
  'PERDIDO',
];

export const ETAPA_LABELS: Record<EtapaLead, string> = {
  NUEVO: 'Nuevo',
  CONTACTADO: 'Contactado',
  EN_NEGOCIACION: 'En negociación',
  OFERTA_ENVIADA: 'Oferta enviada',
  RECUPERADO: 'Recuperado',
  PERDIDO: 'Perdido',
};

export type OrigenLead = 'MANUAL' | 'WOOCOMMERCE' | 'IMPORTADO';

export interface Lead {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string;
  producto: string;
  monto: string;
  moneda: Moneda;
  orden_woo_id: string | null;
  origen: OrigenLead;
  etapa: EtapaLead;
  motivo_abandono: string | null;
  asignado_a_id: string | null;
  asignadoA: Usuario | null;
  notas: string | null;
  archivado?: boolean;
  fecha_archivado?: string | null;
  fecha_cambio_etapa?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadPayload {
  nombre: string;
  email?: string;
  telefono: string;
  producto: string;
  monto: number;
  moneda?: Moneda;
  orden_woo_id?: string;
  etapa?: EtapaLead;
  motivo_abandono?: string;
  asignado_a_id?: string | null;
  notas?: string;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export interface FiltrosLeads {
  etapa?: EtapaLead;
  asignado_a_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface LeadsPaginados {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type LeadKanban = Record<EtapaLead, Lead[]>;
