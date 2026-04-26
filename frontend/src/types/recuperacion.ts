import { Lead } from './lead';

export type TipoEventoRecuperacion =
  | 'AUTO_RECUPERADO'
  | 'AUTO_ORGANICO'
  | 'MANUAL_RECUPERADO'
  | 'REVERSION';

export type OrigenEvento = 'WEBHOOK_WC' | 'MANUAL_AGENTE' | 'CRON';

export type SenalRecuperacion =
  | 'asignado'
  | 'etapa_cambiada'
  | 'correo_enviado';

export interface UsuarioMini {
  id: string;
  nombre: string;
  email: string;
}

export interface EventoRecuperacion {
  id: string;
  leadId: string;
  tipo: TipoEventoRecuperacion;
  etapaAnterior: string | null;
  asignadoAId: string | null;
  asignadoA?: UsuarioMini | null;
  senalesDetectadas: SenalRecuperacion[];
  origen: OrigenEvento;
  // Backend serializa el TINYINT(1) como 0/1 en algunos casos y boolean en
  // otros — consumidores deben normalizar con Boolean().
  decididoAutomaticamente: boolean | number;
  decididoPorId: string | null;
  decididoPor?: UsuarioMini | null;
  notas: string | null;
  createdAt: string;
}

export interface CambiarAtribucionPayload {
  recuperadoPorAgente: boolean;
  notas?: string;
}

export interface CambiarAtribucionResponse {
  lead: Lead;
  evento: EventoRecuperacion;
}
