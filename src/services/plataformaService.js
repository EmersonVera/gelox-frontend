import api from '../api/axiosConfig';
import * as mock from './mocks/mockPlataforma';

// Panel del Superadministrador (RF58, RF59). Mientras el backend de plataforma (T117)
// no esté desplegado, las funciones responden con datos simulados
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

/** La respuesta trae correoEnviado: false cuando la distribuidora se creó pero el correo al gerente falló. */
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
