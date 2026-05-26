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
 * GET /api/inventario/buscar?estado=NORMAL&nombre=corneto
 */
export async function buscarProductosInventario({ nombre, estado } = {}) {
  const params = {};
  if (nombre) params.nombre = nombre;
  if (estado) params.estado = estado;
  const { data } = await api.get('/api/inventario/buscar', { params });
  return data;
}
