export interface ConfiguracionUI {
  id: number;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string | null;
  tieneSmtpPassword: boolean;
  smtp_from_email: string | null;
  smtp_from_nombre: string | null;
  google_client_id: string | null;
  tieneGoogleClientSecret: boolean;
  google_redirect_uri: string | null;
  google_habilitado: boolean;
  updated_at: string;
  updated_by_id: string | null;
}

export interface ActualizarConfiguracionPayload {
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_secure?: boolean;
  smtp_user?: string | null;
  smtp_password?: string;
  smtp_from_email?: string | null;
  smtp_from_nombre?: string | null;
  google_client_id?: string | null;
  google_client_secret?: string;
  google_redirect_uri?: string | null;
  google_habilitado?: boolean;
}

export interface KpisDashboard {
  totalLeads: number;
  leadsPorEtapa: { etapa: string; cantidad: number }[];
  montoTotalRecuperado: number;
  montoEnNegociacion: number;
  tasaRecuperacion: number;
  leadsAsignadosAMi: number;
  leadsNuevosHoy: number;
  topAgentes: {
    usuarioId: string;
    nombre: string;
    recuperados: number;
    montoRecuperado: number;
  }[];
}
