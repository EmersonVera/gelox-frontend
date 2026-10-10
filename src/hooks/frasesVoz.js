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

// Frase completa (anclada): así la narración del resumen ("…¿Confirmas?")
// que capte el micrófono no se toma como confirmación.
const CONFIRMAR_REGEX = /^(?:si )*(?:confirmar|confirmo|confirma|confirmado|si|dale|listo|correcto|ok|okey|okay|de acuerdo|claro|hagale|hazlo)(?: por favor)?$/;
const CANCELAR_REGEX = /^(?:no )*(?:cancelar|cancela|cancelalo|cancelado|no|olvidalo|detente)(?: por favor)?$/;

export const esConfirmar = (texto) => CONFIRMAR_REGEX.test(normalizar(texto));
export const esCancelar = (texto) => CANCELAR_REGEX.test(normalizar(texto));
