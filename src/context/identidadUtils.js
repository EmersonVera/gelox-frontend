// Utilidades de la identidad visual (RF60): colores derivados, contraste e iniciales.

export const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const esHexValido = (valor) => HEX_REGEX.test(valor ?? '');

function aRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex(rgb) {
  return '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** Mezcla `hex` con `con` dejando `peso` (0–1) del color original. */
export function mezclar(hex, con, peso) {
  const a = aRgb(hex);
  const b = aRgb(con);
  return aHex(a.map((c, i) => c * peso + b[i] * (1 - peso)));
}

/** Primario 20 % más oscuro (FP-15 2.13.1). */
export const oscurecer = (hex) => mezclar(hex, '#000000', 0.8);

/** Primario mezclado al 15 % con blanco (FP-15 2.13.1). */
export const tintar = (hex) => mezclar(hex, '#ffffff', 0.15);

function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre texto blanco y `hex`. */
export const contrasteConBlanco = (hex) => 1.05 / (luminancia(hex) + 0.05);

/** "Mágico Sabor" → "MS"; "Polar" → "PO". */
export function iniciales(nombre) {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return 'G';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}
