// Avisos que el backend envía en encabezados al crear o exportar un pedido (RF63 y RF67).
// Cada texto llega codificado para URL y los textos van separados por «|».

const decodificar = (valor) =>
  String(valor ?? '')
    .split('|')
    .filter(Boolean)
    .map((texto) => {
      // El backend codifica con URLEncoder: los espacios llegan como «+».
      try { return decodeURIComponent(texto.replace(/\+/g, ' ')); } catch { return texto; }
    });

/** leer: (nombreDelEncabezado en minúsculas) => valor o null/undefined. */
export function avisosDePedido(leer) {
  return {
    montoMinimo: decodificar(leer('x-advertencias-monto-minimo')),
    sinCodigo:   [...new Set(decodificar(leer('x-productos-sin-codigo')))],
    noUbicados:  [...new Set(decodificar(leer('x-productos-no-ubicados')))],
  };
}

export const hayAvisos = (avisos) =>
  !!avisos && (avisos.montoMinimo.length > 0 || avisos.sinCodigo.length > 0 || avisos.noUbicados.length > 0);
