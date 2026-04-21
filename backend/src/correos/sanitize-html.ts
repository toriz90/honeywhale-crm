/**
 * Sanitizador simple (basado en regex) para cuerpos HTML de correos.
 * No pretende reemplazar DOMPurify — su objetivo es bloquear los vectores
 * más comunes de XSS/phishing que un agente podría meter (a propósito o no)
 * en el composer de plantillas: scripts, iframes, handlers inline, javascript:,
 * data URIs ejecutables, expressions CSS.
 *
 * Si en el futuro aceptamos HTML mucho más rico, conviene migrar a sanitize-html
 * o a un parser DOM real — este helper se queda como capa base.
 */

const PATTERNS: Array<{ re: RegExp; replace: string }> = [
  // Tags completos (incluyendo contenido entre apertura y cierre)
  { re: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, replace: '' },
  { re: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, replace: '' },
  { re: /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, replace: '' },
  { re: /<embed\b[^>]*>/gi, replace: '' },
  { re: /<link\b[^>]*>/gi, replace: '' },
  { re: /<meta\b[^>]*>/gi, replace: '' },
  // Tags self-closing por si alguien escribió <script />
  { re: /<script\b[^>]*\/>/gi, replace: '' },
  { re: /<iframe\b[^>]*\/>/gi, replace: '' },
  // Handlers inline on*=... (onclick, onerror, onload, onmouseover, etc.)
  // Cubre comillas dobles, simples, y sin comillas.
  { re: /\s+on[a-z]+\s*=\s*"[^"]*"/gi, replace: '' },
  { re: /\s+on[a-z]+\s*=\s*'[^']*'/gi, replace: '' },
  { re: /\s+on[a-z]+\s*=\s*[^\s>]+/gi, replace: '' },
  // Esquemas peligrosos en href/src
  { re: /javascript\s*:/gi, replace: 'about:blocked:' },
  { re: /data\s*:\s*text\/html/gi, replace: 'about:blocked:' },
  { re: /vbscript\s*:/gi, replace: 'about:blocked:' },
  // CSS expression() — vector IE viejo pero no cuesta nada
  { re: /expression\s*\(/gi, replace: 'blocked(' },
];

export function sanitizarHtmlCorreo(html: string): string {
  if (!html) return '';
  let salida = html;
  for (const { re, replace } of PATTERNS) {
    salida = salida.replace(re, replace);
  }
  return salida;
}
