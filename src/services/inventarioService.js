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
