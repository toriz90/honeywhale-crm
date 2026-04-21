import { Plantilla } from './plantilla';
import { Usuario } from './usuario';

export type EstadoCorreo = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'BORRADOR';

export const ESTADO_CORREO_LABELS: Record<EstadoCorreo, string> = {
  PENDIENTE: 'Pendiente',
  ENVIADO: 'Enviado',
  FALLIDO: 'Fallido',
  BORRADOR: 'Borrador',
};

export interface CorreoEnviado {
  id: string;
  plantilla_id: string | null;
  plantilla?: Plantilla | null;
  lead_id: string;
  usuario_id: string | null;
  usuario?: Usuario | null;
  asunto_final: string;
  cuerpo_html_final: string;
  cuerpo_texto_final: string | null;
  destinatario_email: string;
  reply_to: string | null;
  estado: EstadoCorreo;
  error_envio: string | null;
  mensaje_id_smtp: string | null;
  token_tracking: string | null;
  fecha_envio: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnviarCorreoPayload {
  leadId: string;
  plantillaId?: string;
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto?: string;
}
