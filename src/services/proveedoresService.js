import api from '../api/axiosConfig';
import * as mock from './mocks/mockProveedores';

// Proveedores comerciales y categorías propias del catálogo multimarca.
// Mientras el backend de proveedores no esté desplegado, las funciones responden
// con datos simulados (ver mocks/mockProveedores.js y mocks/proveedores.json).
// Pasar al backend real es poner VITE_USAR_MOCK_IT3=false en el .env, sin tocar código.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_IT3 !== 'false';

const BASE = '/api/proveedores';
const BASE_CATEGORIAS = '/api/catalogo/categorias';

/*
 * Proveedor:
 *   { id, nombreComercial, razonSocial, nit (solo dígitos, sin DV), contactoNombre,
 *     contactoTelefono, contactoCorreo, tiempoEntregaDias (días hábiles),
 *     montoMinimo (COP), plantilla, activo, productosAsociados, createdAt }
 */

const lista = (data) => (Array.isArray(data) ? data : (data?.content ?? []));

/** filtros: { q?, activo? } — activo: true | false | undefined (todos). */
export async function listarProveedores(filtros = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''));
  if (USAR_MOCK) return mock.listar(params);
  const { data } = await api.get(BASE, { params });
  return lista(data);
}

/** Solo los activos: son los únicos que se pueden asignar a un producto o usar en un pedido. */
export const listarProveedoresActivos = () => listarProveedores({ activo: true });

export async function obtenerProveedor(id) {
  if (USAR_MOCK) return mock.obtener(id);
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

/** 409 si el NIT ya está registrado en la distribuidora. */
export async function crearProveedor(datos) {
  if (USAR_MOCK) return mock.crear(datos);
  const { data } = await api.post(BASE, datos);
  return data;
}

export async function actualizarProveedor(id, datos) {
  if (USAR_MOCK) return mock.actualizar(id, datos);
  const { data } = await api.put(`${BASE}/${id}`, datos);
  return data;
}

/** Un proveedor inactivo no aparece al generar pedidos ni al asignar productos. */
export async function cambiarEstadoProveedor(id, activo) {
  if (USAR_MOCK) return mock.cambiarEstado(id, activo);
  const { data } = await api.patch(`${BASE}/${id}/estado`, { activo });
  return data;
}

/* ── Categorías propias de la distribuidora: { id, nombre } ── */

export async function listarCategorias() {
  if (USAR_MOCK) return mock.listarCategorias();
  const { data } = await api.get(BASE_CATEGORIAS);
  return lista(data);
}

/** 409 si ya existe una categoría con ese nombre. */
export async function crearCategoria(nombre) {
  if (USAR_MOCK) return mock.crearCategoria(nombre);
  const { data } = await api.post(BASE_CATEGORIAS, { nombre });
  return data;
}
