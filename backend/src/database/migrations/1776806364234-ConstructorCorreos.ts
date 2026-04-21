import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class ConstructorCorreos1776806364234 implements MigrationInterface {
  name = 'ConstructorCorreos1776806364234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === Tabla plantillas_correo =========================================
    await queryRunner.query(`
      CREATE TABLE \`plantillas_correo\` (
        \`id\` char(36) NOT NULL,
        \`nombre\` varchar(120) NOT NULL,
        \`descripcion\` text NULL,
        \`asunto\` varchar(255) NOT NULL,
        \`cuerpo_html\` mediumtext NOT NULL,
        \`cuerpo_texto\` mediumtext NULL,
        \`categoria\` enum('RECORDATORIO','DESCUENTO','URGENCIA','PERSONAL','OTRO')
          NOT NULL DEFAULT 'OTRO',
        \`temperaturas_recomendadas\` json NULL,
        \`creado_por\` char(36) NULL,
        \`activa\` tinyint(1) NOT NULL DEFAULT 1,
        \`veces_usada\` int unsigned NOT NULL DEFAULT 0,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` timestamp(6) NULL DEFAULT NULL,
        INDEX \`IDX_plantillas_categoria\` (\`categoria\`),
        INDEX \`IDX_plantillas_activa\` (\`activa\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_plantillas_creado_por\`
          FOREIGN KEY (\`creado_por\`) REFERENCES \`usuarios\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // === Tabla correos_enviados =========================================
    await queryRunner.query(`
      CREATE TABLE \`correos_enviados\` (
        \`id\` char(36) NOT NULL,
        \`plantilla_id\` char(36) NULL,
        \`lead_id\` char(36) NOT NULL,
        \`usuario_id\` char(36) NULL,
        \`asunto_final\` varchar(255) NOT NULL,
        \`cuerpo_html_final\` mediumtext NOT NULL,
        \`cuerpo_texto_final\` mediumtext NULL,
        \`destinatario_email\` varchar(255) NOT NULL,
        \`reply_to\` varchar(255) NULL,
        \`estado\` enum('PENDIENTE','ENVIADO','FALLIDO','BORRADOR')
          NOT NULL DEFAULT 'PENDIENTE',
        \`error_envio\` text NULL,
        \`mensaje_id_smtp\` varchar(255) NULL,
        \`token_tracking\` varchar(120) NULL,
        \`fecha_envio\` datetime NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_correos_token_tracking\` (\`token_tracking\`),
        INDEX \`IDX_correos_lead_created\` (\`lead_id\`, \`created_at\`),
        INDEX \`IDX_correos_estado\` (\`estado\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_correos_plantilla\`
          FOREIGN KEY (\`plantilla_id\`) REFERENCES \`plantillas_correo\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_correos_lead\`
          FOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_correos_usuario\`
          FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // === Tabla tracking_eventos =========================================
    await queryRunner.query(`
      CREATE TABLE \`tracking_eventos\` (
        \`id\` char(36) NOT NULL,
        \`correo_id\` char(36) NOT NULL,
        \`tipo\` enum('ENVIADO','ABIERTO','CLICKEADO','CONVERTIDO','REBOTE') NOT NULL,
        \`metadata\` json NULL,
        \`ip\` varchar(45) NULL,
        \`user_agent\` varchar(500) NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_tracking_correo_tipo\` (\`correo_id\`, \`tipo\`),
        INDEX \`IDX_tracking_tipo_created\` (\`tipo\`, \`created_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_tracking_correo\`
          FOREIGN KEY (\`correo_id\`) REFERENCES \`correos_enviados\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // === Seed: 6 plantillas profesionales ================================
    for (const p of plantillasSeed) {
      await queryRunner.query(
        `INSERT INTO \`plantillas_correo\`
          (id, nombre, descripcion, asunto, cuerpo_html, cuerpo_texto,
           categoria, temperaturas_recomendadas, creado_por, activa, veces_usada)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), NULL, 1, 0)`,
        [
          randomUUID(),
          p.nombre,
          p.descripcion,
          p.asunto,
          p.cuerpoHtml,
          p.cuerpoTexto,
          p.categoria,
          JSON.stringify(p.temperaturas),
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`tracking_eventos\``);
    await queryRunner.query(`DROP TABLE \`correos_enviados\``);
    await queryRunner.query(`DROP TABLE \`plantillas_correo\``);
  }
}

// =====================================================================
// HTML email helpers (todo inline, sin clases CSS, table-based layout)
// =====================================================================

const COLOR_FONDO = '#f6f8fa';
const COLOR_CARD = '#ffffff';
const COLOR_TEXTO = '#1f2328';
const COLOR_TEXTO_TENUE = '#656d76';
const COLOR_ACCENT = '#0969da';
const COLOR_ACCENT_HOVER = '#0860ca';
const COLOR_BORDE = '#d0d7de';

interface PlantillaSeed {
  nombre: string;
  descripcion: string;
  asunto: string;
  cuerpoHtml: string;
  cuerpoTexto: string;
  categoria: 'RECORDATORIO' | 'DESCUENTO' | 'URGENCIA' | 'PERSONAL' | 'OTRO';
  temperaturas: string[];
}

function layout(opts: {
  preheader?: string;
  saludo: string;
  parrafos: string[];
  ctaTexto?: string;
  ctaHref?: string;
  destacado?: string;
  cierre: string;
}): string {
  const cta = opts.ctaTexto && opts.ctaHref
    ? `
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" bgcolor="${COLOR_ACCENT}" style="border-radius:6px;">
                <a href="${opts.ctaHref}"
                   style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;
                          color:#ffffff;text-decoration:none;border-radius:6px;
                          background-color:${COLOR_ACCENT};border:1px solid ${COLOR_ACCENT_HOVER};">
                  ${opts.ctaTexto}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  const destacado = opts.destacado
    ? `
      <tr>
        <td style="padding:0 0 16px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="background-color:#fff8e1;border-left:4px solid #f5a623;
                         padding:12px 16px;border-radius:4px;font-size:14px;color:${COLOR_TEXTO};">
                ${opts.destacado}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  const parrafosHtml = opts.parrafos
    .map(
      (p) => `
      <tr>
        <td style="padding:0 0 14px;font-size:15px;line-height:1.55;color:${COLOR_TEXTO};">
          ${p}
        </td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{{nombre_tienda}}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR_FONDO};
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>` : ''}
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:${COLOR_FONDO};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;width:100%;background-color:${COLOR_CARD};
                      border:1px solid ${COLOR_BORDE};border-radius:8px;">
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${COLOR_TEXTO};">
                ${opts.saludo}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                ${parrafosHtml}
                ${destacado}
              </table>
            </td>
          </tr>
          ${cta ? `<tr><td style="padding:0 28px;"><table width="100%" role="presentation">${cta}</table></td></tr>` : ''}
          <tr>
            <td style="padding:0 28px 24px;font-size:15px;line-height:1.55;color:${COLOR_TEXTO};">
              ${opts.cierre}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid ${COLOR_BORDE};
                       font-size:12px;color:${COLOR_TEXTO_TENUE};text-align:center;">
              {{firma_empresa}}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${COLOR_TEXTO_TENUE};">
          {{nombre_tienda}} · <a href="{{link_tienda}}" style="color:${COLOR_TEXTO_TENUE};">{{link_tienda}}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const FIRMA_AGENTE_HTML = `
  Un saludo,<br>
  <strong>{{nombre_agente}}</strong><br>
  <span style="color:${COLOR_TEXTO_TENUE};">{{nombre_tienda}}</span><br>
  <span style="color:${COLOR_TEXTO_TENUE};">{{telefono_agente}}</span>
`;

// =====================================================================
// 6 plantillas seed
// =====================================================================

const plantillasSeed: PlantillaSeed[] = [
  {
    nombre: 'Respuesta inmediata (caliente)',
    descripcion:
      'Para leads recién abandonados (< 15 min). Tono directo, ofrece ayuda y CTA al pago.',
    categoria: 'PERSONAL',
    temperaturas: ['caliente'],
    asunto: '{{nombre}}, te ayudo a terminar tu compra 🛴',
    cuerpoHtml: layout({
      preheader: 'Vi que dejaste algo en tu carrito y quería ayudarte.',
      saludo: '{{saludo_horario}} {{nombre}},',
      parrafos: [
        'Vi que estabas interesado en <strong>{{productos}}</strong>. ¿Tuviste algún problema al finalizar tu compra?',
        'Estoy aquí para resolver cualquier duda — desde la talla, el envío, o si prefieres pagar de otra forma.',
      ],
      ctaTexto: 'Continuar con mi pedido',
      ctaHref: '{{link_pago}}',
      cierre: `Si prefieres que te ayude por teléfono, respóndeme este correo o llámame al <strong>{{telefono_agente}}</strong>.<br><br>${FIRMA_AGENTE_HTML}`,
    }),
    cuerpoTexto: `{{saludo_horario}} {{nombre}},

Vi que estabas interesado en {{productos}}. ¿Tuviste algún problema al finalizar tu compra?

Continúa tu pedido aquí: {{link_pago}}

Si prefieres que te ayude por teléfono, respóndeme este correo o llámame al {{telefono_agente}}.

Un saludo,
{{nombre_agente}}
{{nombre_tienda}}`,
  },

  {
    nombre: 'Recordatorio suave (tibio)',
    descripcion:
      'Recordatorio amistoso para leads de hasta una hora. Tono cercano sin presión.',
    categoria: 'RECORDATORIO',
    temperaturas: ['tibio'],
    asunto: '¿Aún quieres ese {{producto_primer_item}}? 🛍️',
    cuerpoHtml: layout({
      preheader: 'Te dejamos guardado tu carrito por si quieres terminar.',
      saludo: 'Hola {{nombre}},',
      parrafos: [
        'Vi que dejaste tu <strong>{{producto_primer_item}}</strong> a medias. Sin prisa — te lo dejamos guardado por si quieres terminar.',
        'Si te quedaron dudas (envíos, formas de pago, garantía), respóndeme este correo y te ayudo personalmente.',
      ],
      ctaTexto: 'Retomar mi pedido',
      ctaHref: '{{link_pago}}',
      cierre: FIRMA_AGENTE_HTML,
    }),
    cuerpoTexto: `Hola {{nombre}},

Vi que dejaste tu {{producto_primer_item}} a medias. Sin prisa — te lo dejamos guardado por si quieres terminar.

Retomar pedido: {{link_pago}}

Si te quedaron dudas, respóndeme este correo y te ayudo personalmente.

Un saludo,
{{nombre_agente}}
{{nombre_tienda}}`,
  },

  {
    nombre: 'Urgencia con stock (templado/enfriándose)',
    descripcion:
      'Genera urgencia natural mencionando stock limitado. Para leads de 1-24h.',
    categoria: 'URGENCIA',
    temperaturas: ['templado', 'enfriandose'],
    asunto: 'Tu {{producto_primer_item}} está casi agotado ⚡',
    cuerpoHtml: layout({
      preheader: 'Quedan pocas unidades del producto que te interesó.',
      saludo: 'Hola {{nombre}},',
      parrafos: [
        'Te escribo porque quedan <strong>pocas unidades</strong> del <strong>{{producto_primer_item}}</strong> que estuviste viendo. Si quieres asegurarlo, este es el mejor momento para cerrar tu pedido.',
        'El total de tu carrito es <strong>{{monto_total}}</strong>.',
      ],
      destacado: '⚠️ <strong>Stock limitado</strong> — no podemos garantizar disponibilidad si esperas más.',
      ctaTexto: 'Asegurar mi pedido ahora',
      ctaHref: '{{link_pago}}',
      cierre: `Si necesitas que te lo aparte mientras decides, respóndeme y vemos opciones.<br><br>${FIRMA_AGENTE_HTML}`,
    }),
    cuerpoTexto: `Hola {{nombre}},

Quedan POCAS UNIDADES del {{producto_primer_item}} que estuviste viendo. Si quieres asegurarlo, este es el mejor momento para cerrar tu pedido.

Total de tu carrito: {{monto_total}}

Asegurar mi pedido: {{link_pago}}

Si necesitas que te lo aparte, respóndeme.

Un saludo,
{{nombre_agente}}
{{nombre_tienda}}`,
  },

  {
    nombre: 'Descuento 10% (enfriándose/frío)',
    descripcion:
      'Cupón REGRESA10 con 10% para leads de 3h-7d. Vence en 48h.',
    categoria: 'DESCUENTO',
    temperaturas: ['enfriandose', 'frio'],
    asunto: 'Un cupón especial para ti, {{nombre}} 🎁',
    cuerpoHtml: layout({
      preheader: 'Te guardamos un 10% para que termines tu compra.',
      saludo: 'Hola {{nombre}},',
      parrafos: [
        'Sabemos que a veces se atraviesa el día. Para que no te quedes sin tu <strong>{{producto_primer_item}}</strong>, te guardamos un cupón.',
        'Úsalo al finalizar tu compra y te ahorras un <strong>10%</strong> sobre el total.',
      ],
      destacado:
        '🎁 Tu código: <strong style="font-size:18px;letter-spacing:1px;">REGRESA10</strong><br><span style="font-size:12px;color:' +
        COLOR_TEXTO_TENUE +
        ';">Válido las próximas 48 horas.</span>',
      ctaTexto: 'Aplicar descuento y pagar',
      ctaHref: '{{link_pago}}',
      cierre: `Cualquier duda, respóndeme directo.<br><br>${FIRMA_AGENTE_HTML}`,
    }),
    cuerpoTexto: `Hola {{nombre}},

Te guardamos un cupón para que no te quedes sin tu {{producto_primer_item}}.

Código: REGRESA10 (10% de descuento)
Válido las próximas 48 horas.

Aplicar descuento: {{link_pago}}

Cualquier duda, respóndeme directo.

Un saludo,
{{nombre_agente}}
{{nombre_tienda}}`,
  },

  {
    nombre: 'Descuento 20% último intento (frío/congelado)',
    descripcion:
      'Cupón VUELVE20 con 20% para leads fríos (>7d). Tono "última oportunidad", vence 24h.',
    categoria: 'DESCUENTO',
    temperaturas: ['frio', 'congelado'],
    asunto: '-20% para cerrar tu compra de {{producto_primer_item}}',
    cuerpoHtml: layout({
      preheader: 'Última oportunidad: 20% de descuento sobre tu carrito.',
      saludo: 'Hola {{nombre}},',
      parrafos: [
        'Hace tiempo que no nos vemos. Antes de cerrar tu carrito, queremos hacer un último intento por ti.',
        'Te dejamos un cupón fuerte para que retomes tu <strong>{{producto_primer_item}}</strong> al precio que merece.',
      ],
      destacado:
        '⏰ Tu código: <strong style="font-size:18px;letter-spacing:1px;">VUELVE20</strong> · <strong>20% off</strong><br><span style="font-size:12px;color:' +
        COLOR_TEXTO_TENUE +
        ';">Sólo válido las próximas 24 horas.</span>',
      ctaTexto: 'Aprovechar 20% ahora',
      ctaHref: '{{link_pago}}',
      cierre: `Si después de hoy no ves un correo nuestro, es porque cerramos tu carrito. Pero si lo aprovechas, te atiendo personalmente.<br><br>${FIRMA_AGENTE_HTML}`,
    }),
    cuerpoTexto: `Hola {{nombre}},

Antes de cerrar tu carrito, último intento: 20% de descuento.

Código: VUELVE20 (20% de descuento)
Válido sólo las próximas 24 horas.

Aprovechar ahora: {{link_pago}}

Si no ves otro correo nuestro después de hoy, es porque cerramos el carrito.

Un saludo,
{{nombre_agente}}
{{nombre_tienda}}`,
  },

  {
    nombre: 'Asistencia personalizada (comodín)',
    descripcion:
      'Comodín conversacional para cualquier temperatura. Sin presión de venta, sólo ofrecer ayuda.',
    categoria: 'PERSONAL',
    temperaturas: ['caliente', 'tibio', 'templado', 'enfriandose', 'frio'],
    asunto: '{{saludo_horario}} {{nombre}}, soy {{nombre_agente}} de {{nombre_tienda}}',
    cuerpoHtml: layout({
      preheader: 'Sólo quería presentarme y ver si puedo ayudarte.',
      saludo: '{{saludo_horario}} {{nombre}},',
      parrafos: [
        'Soy <strong>{{nombre_agente}}</strong>, agente de {{nombre_tienda}}. Vi tu interés en <strong>{{productos}}</strong> y quería presentarme personalmente.',
        'Mi trabajo es asegurarme de que tengas la mejor experiencia: resolver dudas técnicas, comparar opciones, ayudarte con el envío o lo que necesites.',
        'No te preocupes, este no es un correo automático — soy yo, escribiendo desde mi computadora. Cuando me respondas, llega directo a mi bandeja.',
      ],
      ctaTexto: 'Ver mi pedido',
      ctaHref: '{{link_pago}}',
      cierre: `Puedes responderme directo a este correo o, si prefieres, llamarme al <strong>{{telefono_agente}}</strong>.<br><br>${FIRMA_AGENTE_HTML}`,
    }),
    cuerpoTexto: `{{saludo_horario}} {{nombre}},

Soy {{nombre_agente}}, agente de {{nombre_tienda}}. Vi tu interés en {{productos}} y quería presentarme personalmente.

Mi trabajo es asegurarme de que tengas la mejor experiencia: resolver dudas, comparar opciones, ayudarte con el envío.

Este no es un correo automático — soy yo. Cuando me respondas, llega directo a mi bandeja.

Ver pedido: {{link_pago}}

Puedes responderme directo o llamarme al {{telefono_agente}}.

Un saludo,
{{nombre_agente}}
{{nombre_tienda}}`,
  },
];
