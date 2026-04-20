import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { EtapaLead } from '../leads/enums/etapa-lead.enum';
import { Origen } from '../leads/enums/origen.enum';
import {
  ConfiguracionService,
  CredencialesWoocommerce,
} from '../configuracion/configuracion.service';

const ESTADOS_ABANDONADOS = ['pending', 'failed', 'cancelled', 'on-hold'];
const PRODUCTO_MAX_LEN = 500;

export interface ResultadoImportacion {
  creado: boolean;
  leadId?: string;
  motivo?: string;
}

export interface ResultadoSync {
  total: number;
  creados: number;
  ignorados: number;
  errores: { pedidoId?: number; mensaje: string }[];
}

export interface PedidoWooCommerce {
  id: number;
  status: string;
  total?: string;
  currency?: string;
  date_created?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  line_items?: Array<{ quantity: number; name: string }>;
}

@Injectable()
export class WoocommerceService {
  private readonly logger = new Logger(WoocommerceService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly httpService: HttpService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  async probarConexion(): Promise<{
    ok: boolean;
    mensaje: string;
    version?: string;
  }> {
    const creds = await this.configuracionService.obtenerCredencialesWoocommerce();
    const faltante = this.validarCredenciales(creds);
    if (faltante) {
      return { ok: false, mensaje: faltante };
    }
    try {
      const url = `${this.limpiarUrlBase(creds.url!)}/wp-json/wc/v3/system_status`;
      const res = await firstValueFrom(
        this.httpService.get(url, this.configAxios(creds, 10_000)),
      );
      const version =
        (res.data?.environment?.version as string | undefined) ??
        (res.data?.environment?.wp_version as string | undefined);
      return {
        ok: true,
        mensaje: 'Conexión exitosa con WooCommerce',
        version,
      };
    } catch (err) {
      const mensaje = this.mensajeError(err);
      this.logger.warn(`probarConexion falló: ${mensaje}`);
      return { ok: false, mensaje };
    }
  }

  async obtenerPedidosAbandonados(
    desde?: Date | null,
  ): Promise<PedidoWooCommerce[]> {
    const creds = await this.configuracionService.obtenerCredencialesWoocommerce();
    const faltante = this.validarCredenciales(creds);
    if (faltante) {
      throw new Error(faltante);
    }

    const baseUrl = `${this.limpiarUrlBase(creds.url!)}/wp-json/wc/v3/orders`;
    const perPage = 100;
    const pedidos: PedidoWooCommerce[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const params: Record<string, string | number> = {
        status: ESTADOS_ABANDONADOS.join(','),
        per_page: perPage,
        orderby: 'date',
        order: 'desc',
        page: pagina,
      };
      if (desde) {
        params.after = desde.toISOString();
      }
      const res = await firstValueFrom(
        this.httpService.get<PedidoWooCommerce[]>(baseUrl, {
          ...this.configAxios(creds, 30_000),
          params,
        }),
      );
      if (Array.isArray(res.data)) {
        pedidos.push(...res.data);
      }
      const headerTotal = res.headers?.['x-wp-totalpages'];
      totalPaginas = headerTotal ? Number(headerTotal) : 1;
      pagina += 1;
    } while (pagina <= totalPaginas);

    return pedidos;
  }

  async importarPedido(
    pedidoWC: PedidoWooCommerce,
    origen: Origen = Origen.WOOCOMMERCE,
  ): Promise<ResultadoImportacion> {
    if (!pedidoWC || pedidoWC.id === undefined || pedidoWC.id === null) {
      return { creado: false, motivo: 'pedido_sin_id' };
    }
    const idPedido = pedidoWC.id.toString();
    const existente = await this.leadRepo.findOne({
      where: { orden_woo_id: idPedido },
      withDeleted: true,
    });
    if (existente) {
      return { creado: false, motivo: 'ya_existe', leadId: existente.id };
    }

    const billing = pedidoWC.billing ?? {};
    const nombre = `${billing.first_name ?? ''} ${billing.last_name ?? ''}`
      .trim();
    const items = pedidoWC.line_items ?? [];
    let producto = items
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(', ')
      .trim();
    if (!producto) {
      producto = 'Pedido sin productos';
    }
    if (producto.length > PRODUCTO_MAX_LEN) {
      producto = `${producto.slice(0, PRODUCTO_MAX_LEN - 1)}…`;
    }

    const monto = pedidoWC.total ? parseFloat(pedidoWC.total) : 0;
    const montoSeguro = Number.isFinite(monto) ? monto : 0;

    const notasInternas = JSON.stringify({
      estado_wc: pedidoWC.status,
      fecha_pedido: pedidoWC.date_created,
      moneda: pedidoWC.currency,
      items: items.length,
    });

    const nuevo = this.leadRepo.create({
      nombre: nombre.length > 0 ? nombre.slice(0, 150) : 'Sin nombre',
      email: billing.email ?? null,
      telefono: (billing.phone ?? '').toString().slice(0, 30) || 'Sin teléfono',
      producto,
      monto: montoSeguro.toFixed(2),
      orden_woo_id: idPedido,
      origen,
      etapa: EtapaLead.NUEVO,
      notas: notasInternas,
    });

    try {
      const guardado = await this.leadRepo.save(nuevo);
      this.logger.log(
        `Lead creado desde WC (pedido ${idPedido} → lead ${guardado.id})`,
      );
      return { creado: true, leadId: guardado.id };
    } catch (err) {
      const mensaje = this.mensajeError(err);
      this.logger.warn(
        `Error guardando lead del pedido WC ${idPedido}: ${mensaje}`,
      );
      return { creado: false, motivo: `error_guardar: ${mensaje}` };
    }
  }

  async sincronizar(desde?: Date | null): Promise<ResultadoSync> {
    const resultado: ResultadoSync = {
      total: 0,
      creados: 0,
      ignorados: 0,
      errores: [],
    };

    let pedidos: PedidoWooCommerce[] = [];
    try {
      pedidos = await this.obtenerPedidosAbandonados(desde ?? null);
    } catch (err) {
      const mensaje = this.mensajeError(err);
      this.logger.warn(`Fallo al obtener pedidos abandonados: ${mensaje}`);
      resultado.errores.push({ mensaje });
      return resultado;
    }

    resultado.total = pedidos.length;
    this.logger.log(
      `Sincronización WooCommerce: ${pedidos.length} pedidos candidatos`,
    );

    for (const pedido of pedidos) {
      try {
        const r = await this.importarPedido(pedido);
        if (r.creado) resultado.creados += 1;
        else resultado.ignorados += 1;
      } catch (err) {
        resultado.errores.push({
          pedidoId: pedido.id,
          mensaje: this.mensajeError(err),
        });
      }
    }

    await this.configuracionService.actualizarUltimaSyncWoocommerce();
    this.logger.log(
      `Sync terminado: ${resultado.creados} creados, ${resultado.ignorados} ignorados, ${resultado.errores.length} errores`,
    );
    return resultado;
  }

  private validarCredenciales(
    creds: CredencialesWoocommerce,
  ): string | null {
    if (!creds.habilitado) {
      return 'La integración con WooCommerce está deshabilitada';
    }
    if (!creds.url) {
      return 'La URL de WooCommerce no está configurada';
    }
    if (!creds.consumerKey || !creds.consumerSecret) {
      return 'Las credenciales (consumer key/secret) no están configuradas';
    }
    return null;
  }

  private limpiarUrlBase(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private configAxios(
    creds: CredencialesWoocommerce,
    timeoutMs: number,
  ): AxiosRequestConfig {
    return {
      timeout: timeoutMs,
      auth: {
        username: creds.consumerKey ?? '',
        password: creds.consumerSecret ?? '',
      },
      headers: { Accept: 'application/json' },
    };
  }

  private mensajeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Error desconocido';
  }
}
