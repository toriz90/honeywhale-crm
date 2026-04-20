import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { WoocommerceService } from './woocommerce.service';

@Injectable()
export class WoocommerceSyncService {
  private readonly logger = new Logger(WoocommerceSyncService.name);

  constructor(
    private readonly configuracionService: ConfiguracionService,
    private readonly woocommerceService: WoocommerceService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async ejecutarSyncAutomatico(): Promise<void> {
    try {
      const creds =
        await this.configuracionService.obtenerCredencialesWoocommerce();
      if (
        !creds.habilitado ||
        !creds.url ||
        !creds.consumerKey ||
        !creds.consumerSecret
      ) {
        this.logger.debug(
          'WooCommerce sync omitido (deshabilitado o sin credenciales)',
        );
        return;
      }

      const desde = creds.ultimaSync ?? null;
      this.logger.log(
        `Ejecutando sync WooCommerce${desde ? ` (incremental desde ${desde.toISOString()})` : ' (completo)'}`,
      );
      await this.woocommerceService.sincronizar(desde);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error en cron WooCommerce: ${mensaje}`);
    }
  }
}
