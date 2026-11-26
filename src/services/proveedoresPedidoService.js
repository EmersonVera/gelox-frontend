import api from '../api/axiosConfig';
import { USAR_MOCK } from './exportacionService';
import { listarProveedoresActivos } from './proveedoresService';

/** Nombres de campo de la API (RF63) a los que usan las pantallas de pedidos y plantillas. */
const normalizar = (p) => ({
  ...p,
  nombreComercial: p.nombreComercial ?? p.nombre,
  montoMinimo:     p.montoMinimo ?? p.montoMinimoPedido ?? 0,
});

/**
 * Proveedores activos para generar pedidos y configurar plantillas. Sus ids deben ser los reales
 * del backend (los del catálogo y los de /api/proveedores/{id}/plantilla), así que se piden a la
 * API aunque la pantalla de Proveedores siga con datos simulados.
 */
export async function listarProveedoresParaPedido() {
  if (USAR_MOCK) return (await listarProveedoresActivos()).map(normalizar);
  const { data } = await api.get('/api/proveedores', { params: { activo: true } });
  return (Array.isArray(data) ? data : data?.content ?? []).map(normalizar);
}
