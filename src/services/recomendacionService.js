import api from '../api/axiosConfig';
import * as mock from './mocks/mockRecomendacion';

// Recomendación de compras (RF54–RF57) contra el backend real. Los datos simulados
// (mocks/mockRecomendacion.js) se activan con VITE_USAR_MOCK_RECOMENDACION=true en el .env.
// No usa VITE_USAR_MOCK_IT2 porque esa bandera también controla plataforma, que aún es simulada.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_RECOMENDACION === 'true';

/** Devuelve la recomendación con sus ítems por prioridad y los productosExcluidos. */
export async function generarRecomendacion(presupuesto) {
  if (USAR_MOCK) return mock.generar(presupuesto);
  const { data } = await api.post('/api/recomendaciones', { presupuesto });
  return data;
}

/** Detalle con ítems; no trae productosExcluidos (solo vienen al generar). */
export async function obtenerRecomendacion(id) {
  if (USAR_MOCK) return mock.obtener(id);
  const { data } = await api.get(`/api/recomendaciones/${id}`);
  return data;
}

/**
 * decision: APROBADO | MODIFICADO | RECHAZADO. Modificar a 0 cajas equivale a rechazar.
 * Devuelve solo el ítem actualizado.
 */
export async function decidirItem(id, itemId, { decision, cajas, motivo }) {
  if (USAR_MOCK) return mock.decidir(id, itemId, { decision, cajas, motivo });
  const { data } = await api.patch(`/api/recomendaciones/${id}/items/${itemId}`, { decision, cajas, motivo });
  return data;
}

/** Devuelve { pedidoId, exportUrl }. */
export async function generarPedido(id) {
  if (USAR_MOCK) return mock.pedido(id);
  const { data } = await api.post(`/api/recomendaciones/${id}/pedido`);
  return data;
}

/** filtros: { desde, hasta, estado, page, size } — fechas YYYY-MM-DD, página desde 0. */
export async function listarHistorial(filtros = {}) {
  if (USAR_MOCK) return mock.historial(filtros);
  const { data } = await api.get('/api/recomendaciones', { params: filtros });
  return data;
}

export async function obtenerMetricas(desde, hasta) {
  if (USAR_MOCK) return mock.metricas(desde, hasta);
  const { data } = await api.get('/api/recomendaciones/metricas', { params: { desde, hasta } });
  return data;
}
