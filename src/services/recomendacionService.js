import api from '../api/axiosConfig';
import * as mock from './mocks/mockRecomendacion';

// El backend de recomendaciones (RF54–RF57) aún no expone sus endpoints: por
// ahora las funciones responden con datos simulados (ver mocks/mockRecomendacion.js).
// Pasar al backend real es poner VITE_USAR_MOCK_IT2=false en el .env, sin tocar código.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_IT2 !== 'false';

export async function generarRecomendacion(presupuesto) {
  if (USAR_MOCK) return mock.generar(presupuesto);
  const { data } = await api.post('/api/recomendaciones', { presupuesto });
  return data;
}

export async function obtenerRecomendacion(id) {
  if (USAR_MOCK) return mock.obtener(id);
  const { data } = await api.get(`/api/recomendaciones/${id}`);
  return data;
}

/** decision: APROBADO | MODIFICADO | RECHAZADO. Modificar a 0 cajas equivale a rechazar. */
export async function decidirItem(id, itemId, { decision, cajas, motivo }) {
  if (USAR_MOCK) return mock.decidir(id, itemId, { decision, cajas, motivo });
  const { data } = await api.patch(`/api/recomendaciones/${id}/items/${itemId}`, { decision, cajas, motivo });
  return data;
}

/** Devuelve { pedidoId, exportUrl, totalItems, costoAprobado }. */
export async function generarPedido(id) {
  if (USAR_MOCK) return mock.pedido(id);
  const { data } = await api.post(`/api/recomendaciones/${id}/pedido`);
  return data;
}

/** filtros: { desde, hasta, page, size } — fechas YYYY-MM-DD, página desde 0. */
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
