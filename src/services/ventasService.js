import api from '../api/axiosConfig';

export async function getCatalogoVenta() {
  const { data } = await api.get('/api/ventas/catalogo');
  return data;
}

export async function calcularVenta(items) {
  const { data } = await api.post('/api/ventas/calcular', { items });
  return data;
}

export async function confirmarVenta(payload) {
  const { data } = await api.post('/api/ventas/confirmar', payload);
  return data;
}

// ── Planillas ──────────────────────────────────────────────────────────────

export async function getComerciantes() {
  const { data } = await api.get('/api/comerciantes');
  return data;
}

export async function getPlanillaActiva(comercianteId) {
  const { data } = await api.get(`/api/planillas/activa?comercianteId=${comercianteId}`);
  return data; // null si no existe planilla abierta hoy
}

export async function registrarDespacho(payload) {
  // body: { comercianteId, fecha, items: [{ productoId, cantidad, precioUnitario }] }
  const { data } = await api.post('/api/planillas/despacho', payload);
  return data;
}

export async function liquidarPlanilla(planillaId, items) {
  // body: { items: [{ productoId, unidadesDevueltas }] }
  const { data } = await api.post(`/api/planillas/${planillaId}/liquidar`, { items });
  return data;
}

export async function getHistorialPlanillas(comercianteId, desde, hasta) {
  const { data } = await api.get('/api/planillas/historial', {
    params: { comercianteId, desde, hasta },
  });
  return data;
}

export async function getDatosPlanillaImpresion(planillaId) {
  const { data } = await api.get(`/api/planillas/${planillaId}/imprimir`);
  return data;
}

export async function getProductosCatalogo() {
  const { data } = await api.get('/api/ventas/catalogo');
  return data;
}

// RF38 — Historial de planillas cerradas de un comerciante específico
export async function getPlanillasComerciante(comercianteId, fechaInicio, fechaFin) {
  const params = {};
  if (fechaInicio) params.fechaInicio = fechaInicio;
  if (fechaFin) params.fechaFin = fechaFin;
  const { data } = await api.get(`/api/comerciantes/${comercianteId}/planillas`, { params });
  return data;
}

// RF36/RF37 — Detalle de planilla específica (busca en la lista del comerciante)
export async function getPlanillaDetalle(comercianteId, planillaId) {
  const { data } = await api.get(`/api/comerciantes/${comercianteId}/planillas`);
  const planillas = Array.isArray(data) ? data : [];
  return planillas.find((p) => p.planillaId === planillaId) ?? null;
}

// RF36/RF37 — Datos formateados para impresión
export async function imprimirPlanilla(planillaId) {
  const { data } = await api.get(`/api/planillas/${planillaId}/imprimir`);
  return data;
}

// RF39 — Productos del inventario con stock disponible
export async function getProductosEnStock() {
  const { data } = await api.get('/api/inventario/productos');
  return Array.isArray(data) ? data.filter(p => (p.cantidadDisponible ?? 0) > 0) : [];
}
