import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Configuracion } from './configuracion.entity';
import { CryptoService } from '../common/crypto/crypto.service';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';

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
  updated_at: Date;
  updated_by_id: string | null;
}

export interface ConfiguracionDescifrada {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_from_email: string | null;
  smtp_from_nombre: string | null;
  google_client_id: string | null;
  google_client_secret: string | null;
  google_redirect_uri: string | null;
  google_habilitado: boolean;
}

@Injectable()
export class ConfiguracionService {
  private readonly logger = new Logger(ConfiguracionService.name);

  constructor(
    @InjectRepository(Configuracion)
    private readonly repo: Repository<Configuracion>,
    private readonly cryptoService: CryptoService,
  ) {}

  async obtener(): Promise<Configuracion> {
    let config = await this.repo.findOne({ where: { id: 1 } });
    if (!config) {
      const nueva = this.repo.create({
        id: 1,
        smtp_port: 587,
        smtp_secure: false,
        google_habilitado: false,
      });
      config = await this.repo.save(nueva);
    }
    return config;
  }

  async obtenerParaUI(): Promise<ConfiguracionUI> {
    const c = await this.obtener();
    return {
      id: c.id,
      smtp_host: c.smtp_host,
      smtp_port: c.smtp_port,
      smtp_secure: c.smtp_secure,
      smtp_user: c.smtp_user,
      tieneSmtpPassword: !!c.smtp_password_cifrada,
      smtp_from_email: c.smtp_from_email,
      smtp_from_nombre: c.smtp_from_nombre,
      google_client_id: c.google_client_id,
      tieneGoogleClientSecret: !!c.google_client_secret_cifrado,
      google_redirect_uri: c.google_redirect_uri,
      google_habilitado: c.google_habilitado,
      updated_at: c.updated_at,
      updated_by_id: c.updated_by_id,
    };
  }

  async obtenerDescifrada(): Promise<ConfiguracionDescifrada> {
    const c = await this.obtener();
    return {
      smtp_host: c.smtp_host,
      smtp_port: c.smtp_port,
      smtp_secure: c.smtp_secure,
      smtp_user: c.smtp_user,
      smtp_password: c.smtp_password_cifrada
        ? this.cryptoService.decrypt(c.smtp_password_cifrada)
        : null,
      smtp_from_email: c.smtp_from_email,
      smtp_from_nombre: c.smtp_from_nombre,
      google_client_id: c.google_client_id,
      google_client_secret: c.google_client_secret_cifrado
        ? this.cryptoService.decrypt(c.google_client_secret_cifrado)
        : null,
      google_redirect_uri: c.google_redirect_uri,
      google_habilitado: c.google_habilitado,
    };
  }

  async actualizar(
    dto: ActualizarConfiguracionDto,
    usuarioActual: JwtUserPayload,
  ): Promise<ConfiguracionUI> {
    const c = await this.obtener();

    if (dto.smtp_host !== undefined) c.smtp_host = dto.smtp_host;
    if (dto.smtp_port !== undefined) c.smtp_port = dto.smtp_port;
    if (dto.smtp_secure !== undefined) c.smtp_secure = dto.smtp_secure;
    if (dto.smtp_user !== undefined) c.smtp_user = dto.smtp_user;
    if (dto.smtp_from_email !== undefined)
      c.smtp_from_email = dto.smtp_from_email;
    if (dto.smtp_from_nombre !== undefined)
      c.smtp_from_nombre = dto.smtp_from_nombre;

    if (dto.smtp_password !== undefined && dto.smtp_password.length > 0) {
      c.smtp_password_cifrada = this.cryptoService.encrypt(dto.smtp_password);
    }

    if (dto.google_client_id !== undefined)
      c.google_client_id = dto.google_client_id;
    if (dto.google_redirect_uri !== undefined)
      c.google_redirect_uri = dto.google_redirect_uri;
    if (dto.google_habilitado !== undefined)
      c.google_habilitado = dto.google_habilitado;

    if (
      dto.google_client_secret !== undefined &&
      dto.google_client_secret.length > 0
    ) {
      c.google_client_secret_cifrado = this.cryptoService.encrypt(
        dto.google_client_secret,
      );
    }

    c.updated_by_id = usuarioActual.sub;
    await this.repo.save(c);
    return this.obtenerParaUI();
  }

  async probarSmtp(): Promise<{ ok: boolean; error?: string }> {
    try {
      const c = await this.obtenerDescifrada();
      if (
        !c.smtp_host ||
        !c.smtp_port ||
        !c.smtp_user ||
        !c.smtp_password
      ) {
        return {
          ok: false,
          error:
            'SMTP no está configurado, el ADMIN debe completarlo en /configuracion',
        };
      }
      const transporter = nodemailer.createTransport({
        host: c.smtp_host,
        port: c.smtp_port,
        secure: c.smtp_secure,
        auth: { user: c.smtp_user, pass: c.smtp_password },
      });
      await transporter.verify();
      return { ok: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.warn(`probarSmtp falló: ${error}`);
      return { ok: false, error };
    }
  }

  async enviarCorreoPrueba(
    destinatario: string,
  ): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    try {
      const c = await this.obtenerDescifrada();
      if (
        !c.smtp_host ||
        !c.smtp_port ||
        !c.smtp_user ||
        !c.smtp_password
      ) {
        return {
          ok: false,
          error:
            'SMTP no está configurado, el ADMIN debe completarlo en /configuracion',
        };
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
        to: destinatario,
        subject: 'Prueba HoneyWhale CRM',
        text: 'Este es un correo de prueba enviado desde HoneyWhale CRM.',
        html: '<p>Este es un <strong>correo de prueba</strong> enviado desde HoneyWhale CRM.</p>',
      });
      return { ok: true, messageId: info.messageId };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.warn(`enviarCorreoPrueba falló: ${error}`);
      return { ok: false, error };
    }
  }
}
