import { Injectable } from '@nestjs/common';
import { Lead } from '../leads/lead.entity';
import { Usuario } from '../usuarios/usuario.entity';

export interface ConfigMarca {
  nombreTienda: string;
  linkTienda: string;
  /** Teléfono público de la tienda — fuente de {{telefono_tienda}} y del alias deprecado {{telefono_agente}}. */
  telefonoTienda?: string;
  /** Email público de contacto — fuente de {{email_contacto}}. */
  emailContacto?: string;
  logo?: string;
  colorMarca?: string;
}

export interface ContextoCorreo {
  // Cliente
  nombre: string;
  email: string;
  telefono: string;
  saludo_horario: string;

  // Pedido
  productos: string;
  productos_html: string;
  monto_total: string;
  numero_pedido: string;
  fecha_abandono: string;
  link_pago: string;
  link_tienda: string;
  producto_primer_item: string;

  // Agente
  nombre_agente: string;
  email_agente: string;
  /** @deprecated Alias de {{telefono_tienda}}. Se mantiene para no romper plantillas viejas. */
  telefono_agente: string;

  // Marca
  nombre_tienda: string;
  telefono_tienda: string;
  email_contacto: string;
  logo_tienda: string;
  color_marca: string;
  firma_empresa: string;
}

interface NotasLeadWC {
  estado_wc?: string;
  fecha_pedido?: string;
  moneda?: string;
  items?: number | unknown;
  link_checkout?: string;
}

interface ItemCarrito {
  nombre: string;
  cantidad: number;
}

@Injectable()
export class RenderizadoService {
  /**
   * Sustituye {{variable}} con valores del contexto.
   *  - Placeholder con valor undefined/null → string vacío.
   *  - Placeholder desconocido (no existe en el contexto) → se deja tal cual,
   *    útil para detectar typos en plantillas.
   */
  renderizar(texto: string, contexto: ContextoCorreo): string {
    if (!texto) return '';
    const mapa = contexto as unknown as Record<string, unknown>;
    return texto.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (orig, key: string) => {
      if (!Object.prototype.hasOwnProperty.call(mapa, key)) {
        // Placeholder desconocido — lo dejamos tal cual para que se vea el typo.
        return orig;
      }
      const v = mapa[key];
      if (v === undefined || v === null) return '';
      return String(v);
    });
  }

  armarContexto(
    lead: Lead,
    agente: Usuario,
    config: ConfigMarca,
  ): ContextoCorreo {
    const moneda = lead.moneda ?? 'MXN';
    const linkTienda = limpiarUrl(config.linkTienda);
    const items = parsearItemsDesdeProducto(lead.producto);
    const productosTxt = items.length
      ? items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ')
      : (lead.producto || '');
    const productosHtml = items.length
      ? `<ul>${items.map((i) => `<li>${escapeHtml(`${i.cantidad}x ${i.nombre}`)}</li>`).join('')}</ul>`
      : `<p>${escapeHtml(lead.producto || '')}</p>`;
    const primerItem = items[0]?.nombre ?? lead.producto ?? '';

    const notas = parseNotas(lead.notas);
    const linkPago = construirLinkPago(notas, linkTienda);

    const telefonoTienda = (config.telefonoTienda ?? '').trim();
    const emailContacto = (config.emailContacto ?? '').trim();

    return {
      nombre: lead.nombre || '',
      email: lead.email || '',
      telefono: lead.telefono || '',
      saludo_horario: saludoPorHoraMexico(),

      productos: productosTxt,
      productos_html: productosHtml,
      monto_total: formatearMonto(lead.monto, moneda),
      numero_pedido: lead.orden_woo_id ?? '',
      fecha_abandono: formatearFechaCorta(
        lead.fecha_pedido_wc ?? lead.created_at ?? null,
      ),
      link_pago: linkPago,
      link_tienda: linkTienda,
      producto_primer_item: primerItem,

      nombre_agente: agente.nombre ?? '',
      email_agente: agente.email ?? '',
      // Alias retrocompat: {{telefono_agente}} ahora apunta al teléfono de la
      // tienda. Plantillas viejas siguen funcionando sin cambios manuales.
      telefono_agente: telefonoTienda,

      nombre_tienda: config.nombreTienda,
      telefono_tienda: telefonoTienda,
      email_contacto: emailContacto,
      logo_tienda: config.logo ?? '',
      color_marca: config.colorMarca ?? '#0969da',
      firma_empresa: armarFirmaEmpresa(config, agente),
    };
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function limpiarUrl(url: string): string {
  return (url || '').replace(/\/+$/, '');
}

function parseNotas(notas: string | null | undefined): NotasLeadWC {
  if (!notas) return {};
  try {
    const obj = JSON.parse(notas) as unknown;
    return obj && typeof obj === 'object' ? (obj as NotasLeadWC) : {};
  } catch {
    return {};
  }
}

/**
 * El campo lead.producto viene en formato "2x Nombre A, 1x Nombre B".
 * Lo descomponemos en items individuales para placeholders ricos.
 */
function parsearItemsDesdeProducto(producto: string | null): ItemCarrito[] {
  if (!producto) return [];
  return producto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte): ItemCarrito | null => {
      const m = parte.match(/^(\d+)\s*x\s+(.+)$/i);
      if (m) {
        const cantidad = Number(m[1]);
        return {
          cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 1,
          nombre: m[2].trim(),
        };
      }
      return { cantidad: 1, nombre: parte };
    })
    .filter((x): x is ItemCarrito => !!x);
}

function construirLinkPago(notas: NotasLeadWC, linkTienda: string): string {
  if (typeof notas.link_checkout === 'string' && notas.link_checkout.trim()) {
    return notas.link_checkout.trim();
  }
  if (linkTienda) return `${linkTienda}/checkout`;
  return '';
}

function formatearMonto(monto: string | number | null, moneda: string): string {
  const n = typeof monto === 'string' ? Number(monto) : (monto ?? 0);
  if (!Number.isFinite(n)) return `$0.00 ${moneda}`;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(n) + ` ${moneda}`;
}

function formatearFechaCorta(fecha: Date | string | null): string {
  if (!fecha) return '';
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Mexico_City',
  }).format(d);
}

function saludoPorHoraMexico(): string {
  // Extrae la hora local de CDMX sin importar el timezone del contenedor.
  const hora = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Mexico_City',
    }).format(new Date()),
  );
  if (!Number.isFinite(hora)) return 'Hola';
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function armarFirmaEmpresa(config: ConfigMarca, agente: Usuario): string {
  const link = limpiarUrl(config.linkTienda);
  const nombreTienda = escapeHtml(config.nombreTienda);
  const linkEscaped = escapeHtml(link);
  const emailAgente = escapeHtml(agente.email ?? '');
  return `
<div style="font-size:11px;color:#656d76;line-height:1.5;text-align:center;">
  ${nombreTienda} &middot; <a href="${linkEscaped}" style="color:#656d76;text-decoration:underline;">${linkEscaped}</a><br>
  Si no quieres recibir más correos, responde a ${emailAgente} con la palabra "BAJA".
</div>`.trim();
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
