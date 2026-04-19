import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfiguracionService } from '../configuracion/configuracion.service';

export interface EnviarCorreoDto {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configuracionService: ConfiguracionService) {}

  async enviarCorreo(dto: EnviarCorreoDto): Promise<string> {
    const c = await this.configuracionService.obtenerDescifrada();

    if (!c.smtp_host || !c.smtp_port || !c.smtp_user || !c.smtp_password) {
      throw new BadRequestException(
        'SMTP no está configurado, el ADMIN debe completarlo en /configuracion',
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

    const info = await transporter.sendMail({
      from,
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
    });
    this.logger.log(`Correo enviado: ${info.messageId}`);
    return info.messageId;
  }
}
