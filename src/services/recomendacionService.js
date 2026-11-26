import api from '../api/axiosConfig';

// Recomendación de compras (RF54–RF57) contra el backend real.

/** Devuelve la recomendación con sus ítems por prioridad y los productosExcluidos. */
export async function generarRecomendacion(presupuesto) {
  const { data } = await api.post('/api/recomendaciones', { presupuesto });
  return data;
}

/** Detalle con ítems; no trae productosExcluidos (solo vienen al generar). */
export async function obtenerRecomendacion(id) {
  const { data } = await api.get(`/api/recomendaciones/${id}`);
  return data;
}

/**
 * decision: APROBADO | MODIFICADO | RECHAZADO. Modificar a 0 cajas equivale a rechazar.
 * Devuelve solo el ítem actualizado.
 */
export async function decidirItem(id, itemId, { decision, cajas, motivo }) {
  const { data } = await api.patch(`/api/recomendaciones/${id}/items/${itemId}`, { decision, cajas, motivo });
  return data;
}

/**
 * Genera un pedido por proveedor (RF56, RF63). Devuelve { pedidoId, exportUrl, pedidos } donde
 * pedidoId y exportUrl son los del primero y pedidos es
 * [{ pedidoId, proveedorId, proveedorNombre, total, exportUrl, advertenciaMontoMinimo }].
 */
export async function generarPedido(id) {
  const { data } = await api.post(`/api/recomendaciones/${id}/pedido`);
  return data;
}

/**
 * Pedidos ya generados desde una recomendación (al abrirla desde el historial): el backend les pone
 * a todos la misma nota «Generado desde recomendación #xxxxxxxx», uno por proveedor.
 */
export async function listarPedidosDeRecomendacion(id) {
  const { data } = await api.get('/api/inventario/pedidos', {
    params: { q: `recomendación #${id.slice(0, 8)}`, limit: 50 },
  });
  return data?.content ?? [];
}

/** filtros: { desde, hasta, estado, page, size } — fechas YYYY-MM-DD, página desde 0. */
export async function listarHistorial(filtros = {}) {
  const { data } = await api.get('/api/recomendaciones', { params: filtros });
  return data;
}

export async function obtenerMetricas(desde, hasta) {
  const { data } = await api.get('/api/recomendaciones/metricas', { params: { desde, hasta } });
  return data;
}
