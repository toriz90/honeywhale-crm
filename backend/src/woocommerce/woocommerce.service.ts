import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { IsNull, Not, Repository } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { EtapaLead } from '../leads/enums/etapa-lead.enum';
import { Origen } from '../leads/enums/origen.enum';
import {
  ConfiguracionService,
  CredencialesWoocommerce,
} from '../configuracion/configuracion.service';
import { RecuperacionService } from '../leads/recuperacion.service';
import {
  OrigenEvento,
  TipoEventoRecuperacion,
} from '../leads/evento-recuperacion.entity';

const ESTADOS_ABANDONADOS = ['pending', 'failed', 'cancelled', 'on-hold'];
const PRODUCTO_MAX_LEN = 500;
const NOMBRE_PLACEHOLDER = 'Sin nombre';
const PRODUCTO_PLACEHOLDER = 'Pedido sin productos';
const TELEFONO_PLACEHOLDER = 'Sin teléfono';

interface ClienteWC {
  first_name?: string;
  last_name?: string;
}

type CacheClientes = Map<number, ClienteWC | null>;

export interface ResultadoImportacion {
  creado: boolean;
  leadId?: string;
  motivo?: string;
}

export interface ResultadoAutoRecuperado {
  actualizado: boolean;
  lead?: Lead;
  motivo:
    | 'lead_no_encontrado'
    | 'etapa_terminal'
    | 'etapa_no_movible'
    | 'recuperado_por_compra';
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
  date_created_gmt?: string;
  customer_id?: number;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  line_items?: Array<{ quantity: number; name: string }>;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}

export interface ResultadoReparacion {
  total: number;
  reparados: number;
  sinCambios: number;
  errores: { leadId?: string; pedidoId?: string; mensaje: string }[];
}

@Injectable()
export class WoocommerceService {
  private readonly logger = new Logger(WoocommerceService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly httpService: HttpService,
    private readonly configuracionService: ConfiguracionService,
    private readonly recuperacionService: RecuperacionService,
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
    opciones?: {
      creds?: CredencialesWoocommerce;
      cacheClientes?: CacheClientes;
    },
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

    const creds =
      opciones?.creds ??
      (await this.configuracionService.obtenerCredencialesWoocommerce());

    const billing = pedidoWC.billing ?? {};
    const nombre = await this.resolverNombreCliente(
      pedidoWC,
      creds,
      opciones?.cacheClientes,
    );
    const producto = this.resolverProductos(pedidoWC);

    const monto = pedidoWC.total ? parseFloat(pedidoWC.total) : 0;
    const montoSeguro = Number.isFinite(monto) ? monto : 0;

    const items = pedidoWC.line_items ?? [];
    const notasInternas = JSON.stringify({
      estado_wc: pedidoWC.status,
      fecha_pedido: pedidoWC.date_created,
      moneda: pedidoWC.currency,
      items: items.length,
    });

    const fechaPedidoWc = this.parsearFechaPedido(pedidoWC);

    const nuevo = this.leadRepo.create({
      nombre: nombre.slice(0, 150),
      email: billing.email ?? null,
      telefono:
        (billing.phone ?? '').toString().slice(0, 30) || TELEFONO_PLACEHOLDER,
      producto,
      monto: montoSeguro.toFixed(2),
      orden_woo_id: idPedido,
      origen,
      etapa: EtapaLead.NUEVO,
      notas: notasInternas,
      fecha_pedido_wc: fechaPedidoWc,
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

  /**
   * Cuando WooCommerce notifica que un pedido pasó a un estado "ganado"
   * (processing/completed), movemos el lead asociado a RECUPERADO. No creamos
   * leads nuevos: si el cliente compró sin haber abandonado primero, no hay
   * nada que recuperar y se ignora.
   *
   * Las etapas terminales (RECUPERADO/PERDIDO) NO se sobrescriben — un lead
   * ya marcado como PERDIDO no debería volver a moverse automáticamente sin
   * revisión humana.
   */
  async marcarComoRecuperado(
    ordenWooId: number,
  ): Promise<ResultadoAutoRecuperado> {
    const idStr = ordenWooId.toString();
    const lead = await this.leadRepo.findOne({
      where: { orden_woo_id: idStr, archivado: false },
      relations: ['asignadoA'],
    });

    if (!lead) {
      this.logger.log(
        `Lead no encontrado para orden ganada ${idStr} — ignorando`,
      );
      return { actualizado: false, motivo: 'lead_no_encontrado' };
    }

    if (
      lead.etapa === EtapaLead.RECUPERADO ||
      lead.etapa === EtapaLead.PERDIDO
    ) {
      return { actualizado: false, lead, motivo: 'etapa_terminal' };
    }

    const etapasMovibles: ReadonlySet<EtapaLead> = new Set([
      EtapaLead.NUEVO,
      EtapaLead.CONTACTADO,
      EtapaLead.EN_NEGOCIACION,
      EtapaLead.OFERTA_ENVIADA,
    ]);

    if (!etapasMovibles.has(lead.etapa)) {
      return { actualizado: false, lead, motivo: 'etapa_no_movible' };
    }

    // Decisión de atribución ANTES de mover etapa: las señales se evalúan
    // contra el estado actual del lead (etapa previa, asignación previa).
    const etapaAnterior = lead.etapa;
    const senales = await this.recuperacionService.evaluarSenales(lead);

    lead.etapa = EtapaLead.RECUPERADO;
    lead.fecha_cambio_etapa = new Date();
    lead.recuperadoPorAgente = senales.esAgente;
    const guardado = await this.leadRepo.save(lead);

    const tipoEvento = senales.esAgente
      ? TipoEventoRecuperacion.AUTO_RECUPERADO
      : TipoEventoRecuperacion.AUTO_ORGANICO;

    await this.recuperacionService.registrarEvento({
      leadId: guardado.id,
      tipo: tipoEvento,
      etapaAnterior,
      asignadoAId: guardado.asignadoA?.id ?? guardado.asignado_a_id,
      senales: senales.senales,
      origen: OrigenEvento.WEBHOOK_WC,
      decididoAutomaticamente: true,
    });

    this.logger.log(
      `Lead ${guardado.id} → RECUPERADO ${tipoEvento} (orden ${ordenWooId}, señales: ${
        senales.senales.length > 0 ? senales.senales.join(',') : 'ninguna'
      })`,
    );

    return {
      actualizado: true,
      lead: guardado,
      motivo: 'recuperado_por_compra',
    };
  }

  async sincronizar(desde?: Date | null): Promise<ResultadoSync> {
    const resultado: ResultadoSync = {
      total: 0,
      creados: 0,
      ignorados: 0,
      errores: [],
    };

    const creds =
      await this.configuracionService.obtenerCredencialesWoocommerce();
    const faltante = this.validarCredenciales(creds);
    if (faltante) {
      resultado.errores.push({ mensaje: faltante });
      return resultado;
    }

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

    // Cache scoped to this sync run: evita que varios pedidos del mismo
    // customer_id disparen múltiples GET /customers/:id.
    const cacheClientes: CacheClientes = new Map();

    for (const pedido of pedidos) {
      try {
        const r = await this.importarPedido(pedido, Origen.WOOCOMMERCE, {
          creds,
          cacheClientes,
        });
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

  async repararLeadsExistentes(): Promise<ResultadoReparacion> {
    const creds =
      await this.configuracionService.obtenerCredencialesWoocommerce();
    const faltante = this.validarCredenciales(creds);
    if (faltante) {
      throw new Error(faltante);
    }

    const leads = await this.leadRepo.find({
      where: {
        origen: Origen.WOOCOMMERCE,
        orden_woo_id: Not(IsNull()),
      },
      order: { created_at: 'DESC' },
    });

    const resultado: ResultadoReparacion = {
      total: leads.length,
      reparados: 0,
      sinCambios: 0,
      errores: [],
    };

    this.logger.log(`Reparando ${leads.length} leads WooCommerce...`);

    const cacheClientes: CacheClientes = new Map();
    const baseUrl = `${this.limpiarUrlBase(creds.url!)}/wp-json/wc/v3/orders`;

    for (const lead of leads) {
      if (!lead.orden_woo_id) continue;
      try {
        const res = await firstValueFrom(
          this.httpService.get<PedidoWooCommerce>(
            `${baseUrl}/${lead.orden_woo_id}`,
            this.configAxios(creds, 10_000),
          ),
        );
        const pedido = res.data;

        const nombreNuevo = await this.resolverNombreCliente(
          pedido,
          creds,
          cacheClientes,
        );
        const productoNuevo = this.resolverProductos(pedido);
        const emailNuevo = pedido.billing?.email ?? null;
        const telefonoNuevo =
          (pedido.billing?.phone ?? '').toString().slice(0, 30) ||
          TELEFONO_PLACEHOLDER;

        let cambios = false;

        if (
          nombreNuevo !== lead.nombre &&
          (lead.nombre === NOMBRE_PLACEHOLDER ||
            nombreNuevo !== NOMBRE_PLACEHOLDER)
        ) {
          lead.nombre = nombreNuevo.slice(0, 150);
          cambios = true;
        }

        if (
          productoNuevo !== lead.producto &&
          (lead.producto === PRODUCTO_PLACEHOLDER ||
            productoNuevo !== PRODUCTO_PLACEHOLDER)
        ) {
          lead.producto = productoNuevo;
          cambios = true;
        }

        if (emailNuevo !== lead.email) {
          lead.email = emailNuevo;
          cambios = true;
        }

        if (
          telefonoNuevo !== lead.telefono &&
          (lead.telefono === TELEFONO_PLACEHOLDER ||
            telefonoNuevo !== TELEFONO_PLACEHOLDER)
        ) {
          lead.telefono = telefonoNuevo;
          cambios = true;
        }

        if (cambios) {
          await this.leadRepo.save(lead);
          resultado.reparados += 1;
        } else {
          resultado.sinCambios += 1;
        }
      } catch (err) {
        resultado.errores.push({
          leadId: lead.id,
          pedidoId: lead.orden_woo_id ?? undefined,
          mensaje: this.mensajeError(err),
        });
      }
    }

    this.logger.log(
      `Reparación terminada: ${resultado.reparados} reparados, ${resultado.sinCambios} sin cambios, ${resultado.errores.length} errores`,
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

  private parsearFechaPedido(pedido: PedidoWooCommerce): Date {
    // WooCommerce devuelve `date_created_gmt` como ISO sin timezone offset.
    // Lo tratamos como UTC para evitar interpretarlo en hora local del contenedor.
    const gmt = pedido.date_created_gmt?.trim();
    if (gmt) {
      const iso = /Z|[+-]\d{2}:?\d{2}$/.test(gmt) ? gmt : `${gmt}Z`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const local = pedido.date_created?.trim();
    if (local) {
      const d = new Date(local);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  private mensajeError(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Error desconocido';
  }

  private tituloCase(s: string): string {
    return s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private async resolverNombreCliente(
    pedidoWC: PedidoWooCommerce,
    creds: CredencialesWoocommerce,
    cacheClientes?: CacheClientes,
  ): Promise<string> {
    const billing = pedidoWC.billing ?? {};
    const nombreBilling = `${billing.first_name ?? ''} ${billing.last_name ?? ''}`.trim();
    if (nombreBilling.length > 0) {
      return nombreBilling;
    }

    const meta = pedidoWC.meta_data ?? [];
    const claves = ['_billing_full_name', '_shipping_full_name'];
    for (const clave of claves) {
      const entry = meta.find(
        (m) =>
          m?.key === clave &&
          typeof m?.value === 'string' &&
          (m.value as string).trim().length > 0,
      );
      if (entry) {
        return this.tituloCase((entry.value as string).trim());
      }
    }

    if (pedidoWC.customer_id && pedidoWC.customer_id > 0 && creds.url) {
      const customerId = pedidoWC.customer_id;
      let cliente: ClienteWC | null | undefined;
      if (cacheClientes?.has(customerId)) {
        cliente = cacheClientes.get(customerId);
      } else {
        cliente = await this.obtenerCliente(customerId, creds);
        cacheClientes?.set(customerId, cliente);
      }
      if (cliente) {
        const n = `${cliente.first_name ?? ''} ${cliente.last_name ?? ''}`.trim();
        if (n.length > 0) return n;
      }
    }

    if (billing.email) {
      const local = billing.email.split('@')[0] ?? '';
      const spaced = local.replace(/[._-]+/g, ' ').trim();
      if (spaced.length > 0) {
        return this.tituloCase(spaced);
      }
    }

    return NOMBRE_PLACEHOLDER;
  }

  private async obtenerCliente(
    customerId: number,
    creds: CredencialesWoocommerce,
  ): Promise<ClienteWC | null> {
    try {
      const url = `${this.limpiarUrlBase(creds.url!)}/wp-json/wc/v3/customers/${customerId}`;
      const res = await firstValueFrom(
        this.httpService.get<ClienteWC>(url, this.configAxios(creds, 5_000)),
      );
      if (res.data && typeof res.data === 'object') {
        return {
          first_name: res.data.first_name,
          last_name: res.data.last_name,
        };
      }
      return null;
    } catch (err) {
      this.logger.debug(
        `GET /customers/${customerId} falló: ${this.mensajeError(err)}`,
      );
      return null;
    }
  }

  private resolverProductos(pedidoWC: PedidoWooCommerce): string {
    const items = pedidoWC.line_items ?? [];
    if (items.length > 0) {
      let p = items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(', ')
        .trim();
      if (p.length > PRODUCTO_MAX_LEN) {
        p = `${p.slice(0, PRODUCTO_MAX_LEN - 1)}…`;
      }
      return p || PRODUCTO_PLACEHOLDER;
    }

    const meta = pedidoWC.meta_data ?? [];
    const clavesPlugin = [
      '_cart_abandonment_items',
      '_wc_cart_abandoned_items',
      'cartflows_step_order_data',
    ];
    for (const clave of clavesPlugin) {
      const entry = meta.find((m) => m?.key === clave);
      if (!entry) continue;
      const resumen = this.resumirItemsMeta(entry.value);
      if (resumen) {
        return resumen.length > PRODUCTO_MAX_LEN
          ? `${resumen.slice(0, PRODUCTO_MAX_LEN - 1)}…`
          : resumen;
      }
    }

    return PRODUCTO_PLACEHOLDER;
  }

  private resumirItemsMeta(valor: unknown): string | null {
    if (valor === null || valor === undefined) return null;

    let data: unknown = valor;
    if (typeof valor === 'string') {
      const s = valor.trim();
      if (s.length === 0) return null;
      if (s[0] !== '{' && s[0] !== '[') return null;
      try {
        data = JSON.parse(s);
      } catch {
        return null;
      }
    }

    const extraerItem = (it: unknown): string | null => {
      if (!it || typeof it !== 'object') return null;
      const obj = it as Record<string, unknown>;
      const name =
        (typeof obj.name === 'string' && obj.name) ||
        (typeof obj.title === 'string' && obj.title) ||
        (typeof obj.product_name === 'string' && obj.product_name) ||
        null;
      if (!name) return null;
      const qtyRaw = obj.quantity ?? obj.qty ?? 1;
      const qty =
        typeof qtyRaw === 'number'
          ? qtyRaw
          : typeof qtyRaw === 'string'
            ? Number(qtyRaw) || 1
            : 1;
      return `${qty}x ${name}`;
    };

    if (Array.isArray(data)) {
      const partes = data.map(extraerItem).filter((x): x is string => !!x);
      return partes.length > 0 ? partes.join(', ') : null;
    }

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const subcollection = obj.items ?? obj.products ?? obj.line_items;
      if (Array.isArray(subcollection)) {
        return this.resumirItemsMeta(subcollection);
      }
      // Objeto-item suelto.
      const soloItem = extraerItem(obj);
      if (soloItem) return soloItem;
    }

    return null;
  }
}
