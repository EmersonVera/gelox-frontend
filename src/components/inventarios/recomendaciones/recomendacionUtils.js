// Cálculos compartidos por las vistas de recomendación de compras (RF54–RF57).

export const URGENCIAS = {
  CRITICO: { label: 'Crítico', badge: 'bg-[#fef2f2] text-[#dc2626]', dot: 'bg-[#dc2626]', barra: 'bg-[#dc2626]', texto: 'text-[#dc2626]' },
  ALERTA:  { label: 'Alerta',  badge: 'bg-[#fffbeb] text-[#d97706]', dot: 'bg-[#f59e0b]', barra: 'bg-[#f59e0b]', texto: 'text-[#d97706]' },
  ESTABLE: { label: 'Estable', badge: 'bg-[#f0fdf4] text-[#16a34a]', dot: 'bg-[#22c55e]', barra: 'bg-[#22c55e]', texto: 'text-[#78716c]' },
};

/** Ajuste al presupuesto que hizo el motor; COMPLETO no lleva insignia. */
export const AJUSTES = {
  REDUCIDO: { label: 'Reducido', clase: 'bg-[#fffbeb] text-[#b45309] border border-[#fcd34d]' },
  EXCLUIDO: { label: 'Excluido', clase: 'bg-[#f5f5f4] text-[#57534e] border border-[#d6d3d1]' },
};

export const ESTADOS_RECOMENDACION = {
  GENERADA:        { label: 'Generada',        clase: 'bg-[#f5f5f4] text-[#57534e]' },
  EN_REVISION:     { label: 'En revisión',     clase: 'bg-[#fffbeb] text-[#d97706]' },
  PEDIDO_GENERADO: { label: 'Pedido generado', clase: 'bg-[#f0fdf4] text-[#16a34a]' },
  DESCARTADA:      { label: 'Descartada',      clase: 'bg-[#fef2f2] text-[#dc2626]' },
};

/** Entra al pedido: aprobado o modificado con al menos una caja. */
export const esAprobado = (item) =>
  (item.decision === 'APROBADO' || item.decision === 'MODIFICADO') && item.cajasAprobadas > 0;

export const esExcluido = (item) => item.ajustePresupuesto === 'EXCLUIDO';

/** Cajas que entrarían al pedido: las sugeridas mientras siga pendiente. */
export function cajasVigentes(item) {
  if (item.decision === 'PENDIENTE') return item.cajasSugeridas;
  return item.cajasAprobadas ?? 0;
}

const porCaja = (total, cajas) => (cajas > 0 ? Number(total) / cajas : null);

/** null cuando no se conoce: un ítem EXCLUIDO trae 0 cajas y costo 0. */
export const costoCaja  = (item) => porCaja(item.costoEstimado, item.cajasSugeridas);
export const margenCaja = (item) => porCaja(item.margenEsperado, item.cajasSugeridas);

/** Costo de las cajas vigentes; null si hay cajas pero no se conoce el costo por caja. */
export function costoVigente(item) {
  const cajas = cajasVigentes(item);
  if (cajas === 0) return 0;
  const c = costoCaja(item);
  return c == null ? null : cajas * c;
}

export function margenVigente(item) {
  const cajas = cajasVigentes(item);
  if (cajas === 0) return 0;
  const m = margenCaja(item);
  return m == null ? null : cajas * m;
}

export function resumenRecomendacion(rec) {
  const items = rec?.items ?? [];
  const aprobados = items.filter(esAprobado);
  const porUrgencia = Object.keys(URGENCIAS).reduce((acc, u) => {
    acc[u] = aprobados.filter((i) => i.urgencia === u).reduce((s, i) => s + (costoVigente(i) ?? 0), 0);
    return acc;
  }, {});
  const margenSugerido = items.reduce((s, i) => s + Number(i.margenEsperado ?? 0), 0);
  const costoSugerido = Number(rec?.costoTotal ?? 0);
  return {
    costoSugerido,
    margenSugerido,
    margenPct: costoSugerido > 0 ? (margenSugerido / costoSugerido) * 100 : null,
    costoAprobado: Number(rec?.costoAprobado ?? 0),
    porUrgencia,
    criticos: items.filter((i) => i.urgencia === 'CRITICO').length,
    aprobados,
    pendientes: items.filter((i) => i.decision === 'PENDIENTE').length,
    cajasAprobadas: aprobados.reduce((s, i) => s + i.cajasAprobadas, 0),
  };
}

/** Fecha del backend (LocalDateTime sin zona, hora de Bogotá). */
export function formatoFechaHora(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export const formatoNumero = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(Number(n));

/** Mensaje legible de un error de axios ({ error } es el formato del backend). */
export function mensajeError(err, porDefecto) {
  const data = err?.response?.data;
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  return data?.error ?? data?.mensaje ?? data?.message ?? porDefecto;
}
