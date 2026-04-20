import {
  ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ConfiguracionService } from '../../configuracion/configuracion.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(
    private readonly configuracionService: ConfiguracionService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  private baseCorsOrigin(): string {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN') ?? '';
    const base = corsOrigin.split(',')[0]?.trim();
    return base && base !== '*' ? base : '';
  }

  private isCallback(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    return req.path.endsWith('/google/callback');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const c = await this.configuracionService.obtenerDescifrada();
    if (
      !c.google_habilitado ||
      !c.google_client_id ||
      !c.google_client_secret
    ) {
      if (this.isCallback(context)) {
        const res = context.switchToHttp().getResponse<Response>();
        res.redirect(
          302,
          `${this.baseCorsOrigin()}/login?error=google_desactivado`,
        );
        return false;
      }
      throw new NotFoundException('Login con Google no está habilitado');
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      if (this.isCallback(context)) {
        this.logger.warn(
          `Fallo en callback de Google: ${err instanceof Error ? err.message : err}`,
        );
        const res = context.switchToHttp().getResponse<Response>();
        if (!res.headersSent) {
          res.redirect(
            302,
            `${this.baseCorsOrigin()}/login?error=google_desactivado`,
          );
        }
        return false;
      }
      throw err;
    }
  }
}
