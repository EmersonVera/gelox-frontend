// Formateadores compartidos por todas las vistas de respuesta de voz (RF50, RF51 y
// las que agregue Angie en T42). Única definición: no duplicar en cada vista.

/** Formatea un monto en pesos colombianos, ej: 2500 -> "$2.500". Sin dato -> "—". */
export function formatoCOP(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n));
}

/** Formatea un porcentaje, ej: 12 -> "12 %". Sin dato -> "—". */
export function formatoPct(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const valor = Number(n);
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
  return `${texto} %`;
}
