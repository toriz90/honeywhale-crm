import { Controller, Get } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';

@Controller('configuracion')
export class ConfiguracionPublicaController {
  constructor(private readonly service: ConfiguracionService) {}

  // Endpoint público: sólo expone el booleano para que el LoginPage
  // decida si mostrar el botón "Continuar con Google". Nunca expone
  // client_id, client_secret ni redirect_uri.
  @Get('google-habilitado')
  async googleHabilitado(): Promise<{ habilitado: boolean }> {
    const c = await this.service.obtenerDescifrada();
    const habilitado =
      !!c.google_habilitado &&
      !!c.google_client_id &&
      !!c.google_client_secret &&
      !!c.google_redirect_uri;
    return { habilitado };
  }

  // Endpoint público: sólo expone si WooCommerce está habilitado y la URL
  // base (sin credenciales) para que el frontend pueda armar enlaces al
  // backoffice de WordPress desde la ficha del lead.
  @Get('woocommerce-publico')
  async woocommercePublico(): Promise<{
    habilitado: boolean;
    url: string | null;
  }> {
    const creds = await this.service.obtenerCredencialesWoocommerce();
    return {
      habilitado: creds.habilitado,
      url: creds.url,
    };
  }
}
