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
