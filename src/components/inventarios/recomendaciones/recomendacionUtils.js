// Cálculos compartidos por las vistas de recomendación de compras (RF54–RF57).

export const URGENCIAS = {
  CRITICO: { label: 'Crítico', badge: 'bg-[#fef2f2] text-[#dc2626]', dot: 'bg-[#dc2626]', barra: 'bg-[#dc2626]', texto: 'text-[#dc2626]' },
  ALERTA:  { label: 'Alerta',  badge: 'bg-[#fffbeb] text-[#d97706]', dot: 'bg-[#f59e0b]', barra: 'bg-[#f59e0b]', texto: 'text-[#d97706]' },
  ESTABLE: { label: 'Estable', badge: 'bg-[#f0fdf4] text-[#16a34a]', dot: 'bg-[#22c55e]', barra: 'bg-[#22c55e]', texto: 'text-[#78716c]' },
};

export const ESTADOS_RECOMENDACION = {
  GENERADA:        { label: 'Generada',        clase: 'bg-[#f5f5f4] text-[#57534e]' },
  EN_REVISION:     { label: 'En revisión',     clase: 'bg-[#fffbeb] text-[#d97706]' },
  PEDIDO_GENERADO: { label: 'Pedido generado', clase: 'bg-[#f0fdf4] text-[#16a34a]' },
  DESCARTADA:      { label: 'Descartada',      clase: 'bg-[#fef2f2] text-[#dc2626]' },
};

export const esAprobado = (item) => item.decision === 'APROBADO' || item.decision === 'MODIFICADO';

/** Cajas que realmente entrarían al pedido según la decisión tomada. */
export function cajasVigentes(item) {
  if (item.decision === 'RECHAZADO') return 0;
  if (item.decision === 'MODIFICADO') return item.cajasAprobadas ?? 0;
  return item.cajasSugeridas;
}

const porCaja = (total, cajas) => (cajas > 0 ? Number(total) / cajas : 0);

export const costoCaja  = (item) => porCaja(item.costoEstimado, item.cajasSugeridas);
export const margenCaja = (item) => porCaja(item.margenEsperado, item.cajasSugeridas);

export const costoVigente  = (item) => cajasVigentes(item) * costoCaja(item);
export const margenVigente = (item) => cajasVigentes(item) * margenCaja(item);

/** Unidades → cajas (redondeo hacia abajo); sin presentación en caja devuelve las unidades. */
export function aCajas(unidades, item) {
  const upc = item.producto?.unidadesPorCaja;
  return upc > 0 ? Math.floor(Number(unidades) / upc) : Number(unidades);
}

export function resumenRecomendacion(rec) {
  const items = rec?.items ?? [];
  const costo = items.reduce((s, i) => s + costoVigente(i), 0);
  const margen = items.reduce((s, i) => s + margenVigente(i), 0);
  const porUrgencia = Object.keys(URGENCIAS).reduce((acc, u) => {
    acc[u] = items.filter((i) => i.urgencia === u).reduce((s, i) => s + costoVigente(i), 0);
    return acc;
  }, {});
  return {
    costo,
    margen,
    margenPct: costo > 0 ? (margen / costo) * 100 : null,
    porUrgencia,
    criticos: items.filter((i) => i.urgencia === 'CRITICO').length,
    aprobados: items.filter(esAprobado),
    pendientes: items.filter((i) => i.decision === 'PENDIENTE').length,
    cajasAprobadas: items.filter(esAprobado).reduce((s, i) => s + cajasVigentes(i), 0),
    costoAprobado: items.filter(esAprobado).reduce((s, i) => s + costoVigente(i), 0),
  };
}

export function formatoFechaHora(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** Mensaje legible de un error de axios ({ error } es el formato del backend). */
export function mensajeError(err, porDefecto) {
  const data = err?.response?.data;
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  return data?.error ?? data?.mensaje ?? data?.message ?? porDefecto;
}
