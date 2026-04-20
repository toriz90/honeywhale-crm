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
}
