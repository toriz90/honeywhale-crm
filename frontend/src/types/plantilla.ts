import { Usuario } from './usuario';

export type CategoriaPlantilla =
  | 'RECORDATORIO'
  | 'DESCUENTO'
  | 'URGENCIA'
  | 'PERSONAL'
  | 'OTRO';

export type TemperaturaPlantilla =
  | 'caliente'
  | 'tibio'
  | 'templado'
  | 'enfriandose'
  | 'frio'
  | 'congelado';

export const CATEGORIAS: CategoriaPlantilla[] = [
  'RECORDATORIO',
  'DESCUENTO',
  'URGENCIA',
  'PERSONAL',
  'OTRO',
];

export const CATEGORIA_LABELS: Record<CategoriaPlantilla, string> = {
  RECORDATORIO: 'Recordatorio',
  DESCUENTO: 'Descuento',
  URGENCIA: 'Urgencia',
  PERSONAL: 'Personal',
  OTRO: 'Otro',
};

export const TEMPERATURAS_DISPONIBLES: TemperaturaPlantilla[] = [
  'caliente',
  'tibio',
  'templado',
  'enfriandose',
  'frio',
  'congelado',
];

export interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  asunto: string;
  cuerpo_html: string;
  cuerpo_texto: string | null;
  categoria: CategoriaPlantilla;
  temperaturas_recomendadas: TemperaturaPlantilla[] | null;
  creado_por: string | null;
  creadoPor?: Usuario | null;
  activa: boolean;
  veces_usada: number;
  created_at: string;
  updated_at: string;
}

export interface PlantillaPreview {
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto: string | null;
}

export interface CrearPlantillaPayload {
  nombre: string;
  descripcion?: string;
  asunto: string;
  cuerpo_html: string;
  cuerpo_texto?: string;
  categoria?: CategoriaPlantilla;
  temperaturas_recomendadas?: TemperaturaPlantilla[];
  activa?: boolean;
}

export type ActualizarPlantillaPayload = Partial<CrearPlantillaPayload>;

export interface FiltrosPlantillas {
  activa?: boolean;
  categoria?: CategoriaPlantilla;
  temperatura?: TemperaturaPlantilla;
}

/** Lista oficial de placeholders soportados por el backend de renderizado. */
export const PLACEHOLDERS_DISPONIBLES: Array<{
  key: string;
  descripcion: string;
}> = [
  { key: 'nombre', descripcion: 'Nombre del cliente' },
  { key: 'email', descripcion: 'Email del cliente' },
  { key: 'telefono', descripcion: 'Teléfono del cliente' },
  { key: 'saludo_horario', descripcion: '"Buenos días/tardes/noches" según hora MX' },
  { key: 'productos', descripcion: 'Lista compacta: "2x A, 1x B"' },
  { key: 'producto_primer_item', descripcion: 'Nombre del primer item' },
  { key: 'monto_total', descripcion: 'Monto formateado, ej "$12,800.00 MXN"' },
  { key: 'numero_pedido', descripcion: 'ID del pedido en WooCommerce' },
  { key: 'fecha_abandono', descripcion: 'Fecha del pedido, ej "21 de abril"' },
  { key: 'link_pago', descripcion: 'URL para retomar el pago' },
  { key: 'link_tienda', descripcion: 'URL de la tienda' },
  { key: 'nombre_agente', descripcion: 'Tu nombre' },
  { key: 'email_agente', descripcion: 'Tu email (también se usa como Reply-To)' },
  { key: 'telefono_agente', descripcion: 'Tu teléfono (si está cargado)' },
  { key: 'nombre_tienda', descripcion: 'Nombre comercial' },
  { key: 'firma_empresa', descripcion: 'Bloque HTML preformateado de firma' },
];
