import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import {
  PedidoWooCommerce,
  WoocommerceService,
} from './woocommerce.service';

const ESTADOS_ABANDONADOS = new Set([
  'pending',
  'failed',
  'cancelled',
  'on-hold',
]);

const TOPICS_RELEVANTES = new Set(['order.created', 'order.updated']);

interface RequestConRawBody extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks/woocommerce')
export class WoocommerceWebhookController {
  private readonly logger = new Logger(WoocommerceWebhookController.name);

  constructor(
    private readonly configuracionService: ConfiguracionService,
    private readonly woocommerceService: WoocommerceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async recibePedido(
    @Req() req: RequestConRawBody,
    @Headers('x-wc-webhook-signature') signature: string | undefined,
    @Headers('x-wc-webhook-topic') topic: string | undefined,
    // Nest + class-validator dejarían rechazar este payload; WooCommerce envía
    // estructuras variables por evento, así que lo tomamos como any y sólo
    // consumimos los campos que necesitamos en importarPedido().
    @Body() body: PedidoWooCommerce,
  ) {
    try {
      const creds =
        await this.configuracionService.obtenerCredencialesWoocommerce();

      if (!creds.habilitado || !creds.webhookSecret) {
        throw new ServiceUnavailableException({
          error: 'deshabilitado',
        });
      }

      if (!signature) {
        this.logger.warn(
          `Webhook recibido sin firma (ip=${this.obtenerIp(req)})`,
        );
        throw new UnauthorizedException({ error: 'firma_invalida' });
      }

      const rawBody = req.rawBody ?? Buffer.from('');
      if (!this.firmaValida(rawBody, signature, creds.webhookSecret)) {
        this.logger.warn(
          `Webhook con firma inválida (ip=${this.obtenerIp(req)}, topic=${topic ?? 'desconocido'})`,
        );
        throw new UnauthorizedException({ error: 'firma_invalida' });
      }

      if (!topic || !TOPICS_RELEVANTES.has(topic)) {
        return { ignorado: true, motivo: 'topic_ignorado' };
      }

      const estado = body?.status ?? '';
      if (!ESTADOS_ABANDONADOS.has(estado)) {
        return { ignorado: true, motivo: 'estado_no_relevante' };
      }

      const resultado = await this.woocommerceService.importarPedido(body);
      return {
        ok: true,
        creado: resultado.creado,
        motivo: resultado.motivo,
        leadId: resultado.leadId,
      };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Error procesando webhook WooCommerce: ${mensaje}`);
      return { ok: false, error: 'error_interno' };
    }
  }

  private firmaValida(
    rawBody: Buffer,
    firmaRecibida: string,
    secret: string,
  ): boolean {
    const calculada = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    const bufA = Buffer.from(calculada);
    const bufB = Buffer.from(firmaRecibida);
    if (bufA.length !== bufB.length) {
      return false;
    }
    try {
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  private obtenerIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress ?? 'desconocida';
  }
}
