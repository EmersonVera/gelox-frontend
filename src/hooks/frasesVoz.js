// Reconocimiento de frases cortas del asistente de voz, sin React para poder
// probarlas con node (ver frasesVoz.check.mjs).

export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z\s]/g, ' ') // el reconocedor a veces agrega puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

// El reconocedor transcribe "GELOX" de muchas formas: gelox, jelox, helox,
// gelos, yelox, chelos, "gel ox", glox, elox, gelo…
const GELOX_REGEX = /^(?:(?:g|j|h|y|ll|ch|sh|f)e?|e)l+[aeo]?(?:x|s|ks|cs|k|c|z)$|^(?:g|j|y|ch)el+o$/;

export function contienePalabraClave(texto) {
  const palabras = normalizar(texto).split(' ');
  return palabras.some((palabra, i) => {
    if (palabra !== 'hola' && palabra !== 'ola') return false;
    const siguiente = palabras[i + 1] ?? '';
    return GELOX_REGEX.test(siguiente) || GELOX_REGEX.test(siguiente + (palabras[i + 2] ?? ''));
  });
}

// Anclada a las últimas palabras de lo dicho ("bueno, sí confirmo"): la
// narración del resumen ("…¿Confirmas?") no encaja porque "confirmas" no está.
const CONFIRMAR_REGEX = /^(?:(?:si|bueno|ok|listo|claro|eh) )*(?:con ?firm(?:ar|o|a|ado|ada|amos)|si|dale|listo|correcto|ok|okey|okay|de acuerdo|claro|hagale|hazlo|acepto|aceptar|acepta|perfecto|vale|de una|eso es|si senor|si senora|adelante)(?: (?:por favor|la venta|el pedido|todo))?$/;
const CANCELAR_REGEX = /^(?:(?:no|bueno|eh) )*(?:cancel(?:ar|a|alo|ado|o)|rechaz(?:ar|a|alo|o|ado)|anul(?:ar|a|alo)|no|olvidalo|olvida|detente|mejor no|no gracias)(?: (?:por favor|la venta|el pedido|todo|eso))?$/;

/** Prueba la frase entera y sus últimas 1–4 palabras. */
function terminaCon(regex, texto) {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  for (let n = 1; n <= Math.min(4, palabras.length); n += 1) {
    if (regex.test(palabras.slice(-n).join(' '))) return true;
  }
  return false;
}

export const esConfirmar = (texto) => terminaCon(CONFIRMAR_REGEX, texto);
export const esCancelar = (texto) => terminaCon(CANCELAR_REGEX, texto);

/** Frases de ejemplo que el panel muestra como ayuda mientras no hay respuesta. */
export const FRASES_AYUDA = [
  '¿Cuántas cajas de Festival quedan?',
  'Registra dos cajas de Festival',
  '¿Qué me recomiendas pedir con dos millones?',
  'Aprueba el Festival',
  'Genera el pedido',
];

// ── RF55 por voz: recomendación de compra ─────────────────────────────────

const NUMEROS = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veinticinco: 25, treinta: 30,
  cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100,
  ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

/** Como normalizar(), pero conserva los dígitos ("8.500.000" → "8500000"). */
function normalizarConNumeros(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/(\d)[.,](?=\d{3}\b)/g, '$1')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "veinte" → 20, "treinta y cinco" → 35, "12" → 12. Sin número → null. */
export function numeroDicho(texto) {
  const palabras = normalizarConNumeros(texto).split(' ');
  let total = null;
  for (const p of palabras) {
    if (/^\d+$/.test(p)) return Number(p);
    if (p in NUMEROS) total = (total ?? 0) + NUMEROS[p];
    else if (p !== 'y' && total !== null) break;
  }
  return total;
}

/**
 * Monto en pesos dicho de viva voz: "dos millones" → 2000000,
 * "dos millones quinientos mil" → 2500000, "ocho millones y medio" → 8500000,
 * "$8.500.000" → 8500000. Sin monto → null.
 */
export function montoDicho(texto) {
  const palabras = normalizarConNumeros(texto).split(' ');
  let total = 0;
  let actual = 0;
  let hayMonto = false;
  for (const p of palabras) {
    if (/^\d+$/.test(p)) { actual += Number(p); hayMonto = true; }
    else if (p in NUMEROS) { actual += NUMEROS[p]; hayMonto = true; }
    else if (p === 'millon' || p === 'millones') { total += (actual || 1) * 1_000_000; actual = 0; hayMonto = true; }
    else if (p === 'mil') { total += (actual || 1) * 1_000; actual = 0; hayMonto = true; }
    else if (p === 'medio' && total > 0) total += total >= 1_000_000 ? 500_000 : 500;
  }
  const monto = total + actual;
  return hayMonto && monto > 0 ? monto : null;
}

const CONSULTA_RECOMENDACION_REGEX = /\brecomi?end|\brecomendacion\b|\bque (?:me )?(?:conviene|toca|debo) pedir\b|\bque pido\b/;
const GENERAR_PEDIDO_RECOMENDACION_REGEX =
  /^(?:\w+ )?(?:genera|generar|haz|hacer|crea|crear|arma|armar|manda|mandar) (?:el|ese|este) pedido(?: (?:de|con) (?:la|esa|esta) recomendacion)?$/;
const APROBAR_REGEX = /^(?:aprueba|aprobar|apruebo|aprueba me) (?:el |la |los |las )?(.+)$/;
const RECHAZAR_REGEX = /^(?:rechaza|rechazar|descarta|descartar|saca|sacar) (?:el |la |los |las )?(.+?)(?: de la recomendacion)?$/;
const MODIFICAR_REGEX = /^(?:cambia|cambiar|deja|dejar|pon|poner|modifica|modificar) (?:el |la |los |las )?(.+?) (?:a|en) (.+?) cajas?$/;

/**
 * Reconoce las frases del módulo de recomendación. Devuelve
 * { intencion: 'CONSULTAR_RECOMENDACION', presupuesto } o
 * { intencion: 'DECIDIR_RECOMENDACION', accion, producto?, cajas? } o null.
 * accion: APROBAR | MODIFICAR | RECHAZAR | GENERAR_PEDIDO.
 */
export function fraseRecomendacion(texto) {
  const t = normalizarConNumeros(texto);
  if (GENERAR_PEDIDO_RECOMENDACION_REGEX.test(t)) {
    return { intencion: 'DECIDIR_RECOMENDACION', accion: 'GENERAR_PEDIDO' };
  }
  if (CONSULTA_RECOMENDACION_REGEX.test(t)) {
    return { intencion: 'CONSULTAR_RECOMENDACION', presupuesto: montoDicho(t) };
  }
  const modificar = MODIFICAR_REGEX.exec(t);
  if (modificar) {
    const cajas = numeroDicho(modificar[2]);
    if (cajas !== null) return { intencion: 'DECIDIR_RECOMENDACION', accion: 'MODIFICAR', producto: modificar[1], cajas };
  }
  const aprobar = APROBAR_REGEX.exec(t);
  if (aprobar) return { intencion: 'DECIDIR_RECOMENDACION', accion: 'APROBAR', producto: aprobar[1] };
  const rechazar = RECHAZAR_REGEX.exec(t);
  if (rechazar) return { intencion: 'DECIDIR_RECOMENDACION', accion: 'RECHAZAR', producto: rechazar[1] };
  return null;
}
