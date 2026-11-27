import api from '../api/axiosConfig';
import * as mock from './mocks/mockProveedores';

// Proveedores comerciales y categorías propias del catálogo multimarca.
// Mientras el backend de proveedores no esté desplegado, las funciones responden
// con datos simulados (ver mocks/mockProveedores.js y mocks/proveedores.json).
// Los datos simulados se activan con VITE_USAR_MOCK_IT3=true; sin la variable se usa el backend.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_IT3 === 'true';

const BASE = '/api/proveedores';
const BASE_CATEGORIAS = '/api/categorias';

/*
 * Proveedor en las pantallas:
 *   { id, nombreComercial, nit (solo dígitos, sin DV), contactoNombre,
 *     contactoTelefono, contactoCorreo, tiempoEntregaDias (días hábiles, 0 permitido),
 *     montoMinimo (COP), plantilla, activo, productosAsociados, createdAt }
 *
 * Backend (ProveedorDTO / ProveedorRequest, RF63):
 *   { id, nombre, nit, contactoNombre, telefono, correo, tiempoEntregaDias, diasHabiles,
 *     montoMinimoPedido, activo, productosAsociados, plantilla (nombre o null), createdAt }
 * tiempoEntregaDias y montoMinimoPedido son obligatorios en el request (se envían siempre).
 * desdeApi / haciaApi traducen entre las dos formas. El FP-15 no tiene razón social de proveedor.
 */

const lista = (data) => (Array.isArray(data) ? data : (data?.content ?? []));

/** ProveedorDTO → proveedor de pantalla (también acepta la forma del mock). */
export function desdeApi(p) {
  if (!p) return p;
  return {
    ...p,
    nombreComercial:  p.nombreComercial ?? p.nombre ?? '',
    contactoTelefono: p.contactoTelefono ?? p.telefono ?? '',
    contactoCorreo:   p.contactoCorreo ?? p.correo ?? '',
    montoMinimo:      Number(p.montoMinimo ?? p.montoMinimoPedido ?? 0),
    tiempoEntregaDias: p.tiempoEntregaDias ?? 0,
    activo:           p.activo !== false,
  };
}

/** Proveedor de pantalla → ProveedorRequest. */
function haciaApi(datos) {
  return {
    nombre:            datos.nombreComercial,
    nit:               datos.nit || null,
    contactoNombre:    datos.contactoNombre || null,
    telefono:          datos.contactoTelefono || null,
    correo:            datos.contactoCorreo || null,
    tiempoEntregaDias: datos.tiempoEntregaDias,
    diasHabiles:       true,
    montoMinimoPedido: datos.montoMinimo,
  };
}

/** filtros: { q?, activo? } — activo: true | false | undefined (todos). */
export async function listarProveedores(filtros = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''));
  if (USAR_MOCK) return mock.listar(params);
  const { data } = await api.get(BASE, { params });
  return lista(data).map(desdeApi);
}

/** Solo los activos: son los únicos que se pueden asignar a un producto o usar en un pedido. */
export const listarProveedoresActivos = () => listarProveedores({ activo: true });

export async function obtenerProveedor(id) {
  if (USAR_MOCK) return mock.obtener(id);
  const { data } = await api.get(`${BASE}/${id}`);
  return desdeApi(data);
}

/**
 * 409 si el NIT ya está registrado en la distribuidora. El backend crea el proveedor activo;
 * si el formulario lo pide inactivo se desactiva enseguida.
 */
export async function crearProveedor(datos) {
  if (USAR_MOCK) return mock.crear(datos);
  const { data } = await api.post(BASE, haciaApi(datos));
  if (datos.activo === false) return cambiarEstadoProveedor(data.id, false);
  return desdeApi(data);
}

export async function actualizarProveedor(id, datos) {
  if (USAR_MOCK) return mock.actualizar(id, datos);
  const { data } = await api.put(`${BASE}/${id}`, haciaApi(datos));
  return desdeApi(data);
}

/** Un proveedor inactivo no aparece al generar pedidos ni al asignar productos. */
export async function cambiarEstadoProveedor(id, activo) {
  if (USAR_MOCK) return mock.cambiarEstado(id, activo);
  const { data } = await api.patch(`${BASE}/${id}/activar`, null, { params: { activo } });
  return desdeApi(data);
}

/* ── Categorías propias de la distribuidora: { id, nombre, orden, activo } (CategoriaDTO) ── */

export async function listarCategorias() {
  if (USAR_MOCK) return mock.listarCategorias();
  const { data } = await api.get(BASE_CATEGORIAS);
  return lista(data).filter((c) => c.activo !== false);
}

/* ── Unidades de medida de la distribuidora: { id, codigo, nombre } (UnidadMedidaDTO) ──
 * V10 siembra UN, CJ y BOL; la unidad base del producto y sus factores usan estos ids. */
export async function listarUnidades() {
  if (USAR_MOCK) return mock.listarUnidades();
  const { data } = await api.get('/api/unidades');
  return lista(data);
}

/** 409 si ya existe una categoría con ese nombre. */
export async function crearCategoria(nombre) {
  if (USAR_MOCK) return mock.crearCategoria(nombre);
  const { data } = await api.post(BASE_CATEGORIAS, { nombre });
  return data;
}
