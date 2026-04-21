import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LeadsService } from './leads.service';

@Injectable()
export class LeadsArchiveService {
  private readonly logger = new Logger(LeadsArchiveService.name);

  constructor(private readonly leadsService: LeadsService) {}

  @Cron('0 0 1 * *')
  async ejecutarArchivoMensual(): Promise<void> {
    try {
      const ahora = new Date();
      const mesAnterior = new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 1,
        1,
      );
      const year = mesAnterior.getFullYear();
      const month = mesAnterior.getMonth() + 1;

      this.logger.log(
        `Iniciando archivo mensual automático para ${year}-${String(month).padStart(2, '0')}`,
      );
      const resultado = await this.leadsService.archivarMes(year, month);
      this.logger.log(
        `Archivo mensual automático OK: ${resultado.archivados}/${resultado.total}`,
      );
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error en archivo mensual automático: ${mensaje}`);
    }
  }
}
