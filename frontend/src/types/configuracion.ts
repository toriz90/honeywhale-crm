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
  woocommerce_habilitado: boolean;
  woocommerce_url: string | null;
  woocommerce_consumer_key: string | null;
  tieneWoocommerceConsumerSecret: boolean;
  tieneWoocommerceWebhookSecret: boolean;
  woocommerce_ultima_sync: string | null;
  nombre_tienda: string | null;
  telefono_tienda: string | null;
  email_contacto: string | null;
  direccion_tienda: string | null;
  rfc_tienda: string | null;
  logo_url: string | null;
  updated_at: string;
  updated_by_id: string | null;
}

export interface MarcaEmpresa {
  nombreTienda: string;
  telefonoTienda: string;
  emailContacto: string;
  direccionTienda: string;
  rfcTienda: string;
  logoUrl: string;
}

export interface ActualizarMarcaPayload {
  nombreTienda: string;
  telefonoTienda: string;
  emailContacto: string;
  direccionTienda?: string;
  rfcTienda?: string;
  logoUrl?: string;
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
  woocommerce_habilitado?: boolean;
  woocommerce_url?: string | null;
  woocommerce_consumer_key?: string | null;
  woocommerce_consumer_secret?: string;
  woocommerce_webhook_secret?: string;
}

export interface WoocommerceTestResult {
  ok: boolean;
  mensaje: string;
  version?: string;
}

export interface WoocommerceSyncResult {
  total: number;
  creados: number;
  ignorados: number;
  errores: { pedidoId?: number; mensaje: string }[];
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
