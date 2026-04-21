import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfiguracionService } from '../configuracion/configuracion.service';

export interface ParamsEnvio {
  destinatario: string;
  replyTo?: string;
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto?: string;
}

export interface ResultadoEnvio {
  mensajeId: string;
}

@Injectable()
export class EmailSenderService {
  private readonly logger = new Logger(EmailSenderService.name);

  constructor(private readonly configuracionService: ConfiguracionService) {}

  async enviar(params: ParamsEnvio): Promise<ResultadoEnvio> {
    const c = await this.configuracionService.obtenerDescifrada();

    if (!c.smtp_host || !c.smtp_port || !c.smtp_user || !c.smtp_password) {
      throw new ServiceUnavailableException(
        'SMTP no está configurado. El ADMIN debe completarlo en /configuracion.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: c.smtp_host,
      port: c.smtp_port,
      secure: c.smtp_secure,
      auth: { user: c.smtp_user, pass: c.smtp_password },
    });

    const fromEmail = c.smtp_from_email ?? c.smtp_user;
    const from = c.smtp_from_nombre
      ? `"${c.smtp_from_nombre}" <${fromEmail}>`
      : fromEmail;

    try {
      const info = await transporter.sendMail({
        from,
        to: params.destinatario,
        replyTo: params.replyTo,
        subject: params.asunto,
        html: params.cuerpoHtml,
        text: params.cuerpoTexto,
      });
      this.logger.log(
        `SMTP OK destinatario=${params.destinatario} messageId=${info.messageId}`,
      );
      return { mensajeId: info.messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error SMTP desconocido';
      this.logger.warn(
        `SMTP FALLÓ destinatario=${params.destinatario} error=${error}`,
      );
      throw new InternalServerErrorException(`Error enviando correo: ${error}`);
    }
  }
}
