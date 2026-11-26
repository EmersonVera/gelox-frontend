// src/services/inventarioService.js
import api from '../api/axiosConfig';

export async function getProductosInventario() {
  const { data } = await api.get('/api/inventario/productos');
  return data;
}

export async function getAlertasStock() {
  const { data } = await api.get('/api/inventario/alertas');
  return data;
}

/**
 * RF27 — Busca/filtra productos en el inventario por estado (y opcionalmente nombre/código).
 * El backend no tiene /api/inventario/buscar: el filtro va en GET /api/inventario/productos?q=&estado=
 * (InventarioController.listarInventario).
 */
export async function buscarProductosInventario({ nombre, estado } = {}) {
  const params = {};
  if (nombre) params.q = nombre;
  if (estado) params.estado = estado;
  const { data } = await api.get('/api/inventario/productos', { params });
  return data;
}
