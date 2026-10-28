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
  // RF55 — recomendación de compra (las interpreta el backend: CONSULTAR_ y DECIDIR_RECOMENDACION)
  '¿Qué me recomiendas pedir con dos millones?',
  'Aprueba el Mango Biche',
  'Cambia el Mango Biche a 3 cajas',
  'Aprueba todo',
  'Genera el pedido',
];
