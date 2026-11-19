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

// "Sí, aprueba esa", "apruébala", "aprueba todo": confirma, pero solo cuando lo que se está
// confirmando es una aprobación (no un "Rechazar X. ¿Confirmas?").
const APROBAR_ESA_REGEX = /^(?:(?:si|bueno|ok|listo|dale|claro|eh) )*(?:apruebal[ao]s?|aprobarla|aprueba(?:me)?(?: (?:esa|eso|esta|esa misma|la|lo|todo|todos|todas|la recomendacion|esa recomendacion))?)(?: (?:por favor|ya|entonces))?$/;
export const esAprobarEsa = (texto) => terminaCon(APROBAR_ESA_REGEX, texto);

// "Déjame modificar", "quiero cambiar algo", "mejor la edito": abrir la recomendación en pantalla
// para cambiarla. Sin números: "cambia el Mango Biche a 3 cajas" es otra decisión.
const MODIFICAR_REGEX = /^(?:(?:no|si|bueno|mejor|espera|eh) )*(?:(?:dejame|quiero|voy a|vamos a|necesito|prefiero|mejor|la quiero|lo quiero) )?(?:modificar(?:la|lo)?|editar(?:la|lo)?|cambiar(?:la|lo)?|revisar(?:la|lo)?|modificala|editala|la edito|la modifico|modifico)(?: (?:la recomendacion|esa recomendacion|esa|eso|algo|algunas cosas|unas cosas|un poco|primero|en pantalla|antes))?$/;
export function esModificar(texto) {
  const normalizado = normalizar(texto);
  return !/\d/.test(texto) && MODIFICAR_REGEX.test(normalizado);
}

// Palabras para cortar al asistente mientras habla ("para", "espera"). Solo cuentan si no están
// en lo que el asistente está diciendo (si dice "para doña Marta", "para" no corta).
export const PALABRAS_CORTE = new Set(['para', 'parale', 'detente', 'espera', 'esperate', 'silencio', 'callate',
  'basta', 'stop', 'cancela', 'cancelar', 'alto', 'gelox', 'jelox', 'helox']);

/**
 * Filtro de eco: ¿lo que oyó el micrófono mientras el asistente hablaba lo dijo el usuario?
 * Con parlantes, el micrófono también capta la narración; se descartan las palabras que están
 * en el texto narrado y se decide con las que sobran.
 *
 * @returns {'corte' | 'voz' | null} 'corte': dijo una palabra de corte; 'voz': habló algo propio; null: eco.
 */
export function detectarInterrupcion(oido, palabrasNarradas) {
  const palabras = normalizar(oido).split(' ').filter(Boolean);
  if (palabras.length === 0) return null;
  const propias = palabras.filter((p) => !palabrasNarradas.has(p));
  if (propias.some((p) => PALABRAS_CORTE.has(p))) return 'corte';
  const frase = propias.join(' ');
  // Respuestas cortas: "sí", "no", "dale", "apruébala".
  if (propias.length >= 1 && (esConfirmar(frase) || esCancelar(frase) || esAprobarEsa(frase) || esModificar(frase))) {
    return 'voz';
  }
  const significativas = propias.filter((p) => p.length > 2);
  // Al menos 2 palabras que no dijo el asistente y que sean la mayoría de lo oído.
  if (significativas.length >= 2 && propias.length / palabras.length >= 0.5) return 'voz';
  return null;
}

/** Quita del inicio las palabras que eran eco de la narración: "…cajas de festival quita el festival" → "quita el festival". */
export function sinEcoInicial(oido, palabrasNarradas) {
  const palabras = normalizar(oido).split(' ').filter(Boolean);
  let i = 0;
  while (i < palabras.length && palabrasNarradas.has(palabras[i])) i += 1;
  const resto = palabras.slice(i).filter((p) => !PALABRAS_CORTE.has(p));
  return resto.join(' ');
}

/** Palabras (normalizadas) del texto que el asistente va a leer. */
export const palabrasDe = (texto) => new Set(normalizar(texto ?? '').split(' ').filter(Boolean));

/** Frases de ejemplo que el panel muestra como ayuda mientras no hay respuesta. */
export const FRASES_AYUDA = [
  '¿Cuántas cajas de Festival quedan?',
  'Registra dos cajas de Festival',
  // RF55 — recomendación de compra (las interpreta el backend: CONSULTAR_ y DECIDIR_RECOMENDACION)
  '¿Qué me recomiendas pedir con dos millones?',
  'Aprueba el Mango Biche',
  'Cambia el Mango Biche a 3 cajas',
  'Aprueba todo',
  'Genera el pedido',
];
