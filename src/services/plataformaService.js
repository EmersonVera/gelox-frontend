import api from '../api/axiosConfig';
import * as mock from './mocks/mockPlataforma';

// Panel del Superadministrador (RF58, RF59, RF69, RF70, RF71). Mientras el backend de
// plataforma (T117, T185, T191) no esté desplegado, las funciones responden con datos simulados
// (ver mocks/mockPlataforma.js). Pasar al backend real es poner
// VITE_USAR_MOCK_IT2=false en el .env, sin tocar código.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_IT2 !== 'false';

const BASE = '/api/plataforma/distribuidoras';

/** filtros: { estado?, q? } — estado: PRUEBA | ACTIVO | SUSPENDIDO | INACTIVO. */
export async function listarDistribuidoras(filtros = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''));
  if (USAR_MOCK) return mock.listar(params);
  const { data } = await api.get(BASE, { params });
  return Array.isArray(data) ? data : (data?.content ?? []);
}

export async function obtenerDistribuidora(id) {
  if (USAR_MOCK) return mock.obtener(id);
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

/** datos incluye planId (T191). La respuesta trae correoEnviado: false cuando la distribuidora se creó pero el correo al gerente falló. */
export async function crearDistribuidora(datos) {
  if (USAR_MOCK) return mock.crear(datos);
  const { data } = await api.post(BASE, datos);
  return data;
}

/** Motivo obligatorio. 409 si la transición no está permitida (INACTIVO es final). */
export async function cambiarEstado(id, { estado, motivo }) {
  if (USAR_MOCK) return mock.cambiarEstado(id, { estado, motivo });
  const { data } = await api.patch(`${BASE}/${id}/estado`, { estado, motivo });
  return data;
}

/** Genera una contraseña temporal nueva para el gerente titular y le reenvía el correo. */
export async function reenviarAcceso(id) {
  if (USAR_MOCK) return mock.reenviarAcceso(id);
  const { data } = await api.post(`${BASE}/${id}/reenviar-acceso`);
  return data;
}

/* ── Planes de suscripción y cuotas (RF70, T191) ──
 * Las cuotas son enteros ≥ 0 o null (= sin límite). La forma completa de cada
 * respuesta está documentada al inicio de mocks/mockPlataforma.js.
 */
const PLANES = '/api/plataforma/planes';

export async function listarPlanes() {
  if (USAR_MOCK) return mock.listarPlanes();
  const { data } = await api.get(PLANES);
  return Array.isArray(data) ? data : (data?.content ?? []);
}

export async function obtenerPlan(id) {
  if (USAR_MOCK) return mock.obtenerPlan(id);
  const { data } = await api.get(`${PLANES}/${id}`);
  return data;
}

/** 409 si el nombre ya existe; 400 si un valor es negativo. */
export async function crearPlan(datos) {
  if (USAR_MOCK) return mock.crearPlan(datos);
  const { data } = await api.post(PLANES, datos);
  return data;
}

export async function editarPlan(id, datos) {
  if (USAR_MOCK) return mock.editarPlan(id, datos);
  const { data } = await api.put(`${PLANES}/${id}`, datos);
  return data;
}

/** Cambia el plan de una distribuidora; aplica de inmediato y queda en auditoría con el motivo. */
export async function asignarPlan(id, { planId, motivo }) {
  if (USAR_MOCK) return mock.asignarPlan(id, { planId, motivo });
  const { data } = await api.patch(`${BASE}/${id}/plan`, { planId, motivo });
  return data;
}

/* ── Panel de la plataforma (RF69, T185) ── */

/** desde / hasta en formato YYYY-MM-DD (ambos incluidos). */
export async function obtenerPanel({ desde, hasta }) {
  if (USAR_MOCK) return mock.panel({ desde, hasta });
  const { data } = await api.get('/api/plataforma/panel', { params: { desde, hasta } });
  return data;
}

/* ── Log de auditoría (RF71, T191) ── */
const AUDITORIA = '/api/plataforma/auditoria';

/**
 * filtros: { page (desde 0), size, distribuidoraId?, usuarioId?, desde?, hasta?, accion? }.
 * Responde una página de Spring: { content, totalElements, totalPages, number, size }.
 */
export async function listarAuditoria(filtros = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  if (USAR_MOCK) return mock.listarAuditoria(params);
  const { data } = await api.get(AUDITORIA, { params });
  if (Array.isArray(data)) {
    return { content: data, totalElements: data.length, totalPages: 1, number: 0, size: data.length };
  }
  return data;
}

/** Códigos de acción para el filtro (ej. «ASIGNAR_PLAN»). Acepta también [{ codigo, etiqueta }]. */
export async function listarAccionesAuditoria() {
  if (USAR_MOCK) return mock.listarAccionesAuditoria();
  const { data } = await api.get(`${AUDITORIA}/acciones`);
  return Array.isArray(data) ? data : [];
}

/** Usuarios que aparecen en el log, para el filtro; con distribuidoraId solo los de esa distribuidora. */
export async function listarUsuariosAuditoria({ distribuidoraId } = {}) {
  if (USAR_MOCK) return mock.listarUsuariosAuditoria({ distribuidoraId });
  const { data } = await api.get(`${AUDITORIA}/usuarios`, { params: distribuidoraId ? { distribuidoraId } : {} });
  return Array.isArray(data) ? data : [];
}
