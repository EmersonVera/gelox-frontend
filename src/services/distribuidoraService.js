import api from '../api/axiosConfig';
import * as mock from './mocks/mockIdentidad';

// El backend de identidad y landing por subdominio (T119) aún no está integrado:
// por ahora las funciones responden con datos simulados (ver mocks/mockIdentidad.js).
// Pasar al backend real es poner VITE_USAR_MOCK_IT2=false en el .env, sin tocar código.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_IT2 !== 'false';

/* ── RF60 — Identidad visual de la distribuidora del usuario ── */

/** Devuelve { nombreComercial, logoUrl, faviconUrl, colorPrimario, colorSecundario }. */
export async function obtenerIdentidad() {
  if (USAR_MOCK) return mock.obtener();
  const { data } = await api.get('/api/distribuidora/identidad');
  return data;
}

/** formData: nombreComercial, colorPrimario, colorSecundario, logo?, favicon? (solo ADMINISTRADOR). */
export async function actualizarIdentidad(formData) {
  if (USAR_MOCK) return mock.actualizar(formData);
  const { data } = await api.put('/api/distribuidora/identidad', formData);
  return data;
}

/** Solo modo simulado: cambia la identidad de ejemplo ('magicosabor' | 'heladospolar'). */
export const usarIdentidadDePrueba = (clave) => mock.usarPreset(clave);

/* ── RF61 — Landing pública por subdominio (404 si no existe o no está activa) ── */

export async function obtenerInfoNegocio(subdominio) {
  if (USAR_MOCK) return mock.landingInfoNegocio(subdominio);
  const { data } = await api.get(`/api/landing/${encodeURIComponent(subdominio)}/info-negocio`);
  return data;
}

/** Devuelve { CATEGORIA: [{ nombre, imagenUrl, precioVenta, descripcion, categoria }] }. */
export async function obtenerProductosLanding(subdominio) {
  if (USAR_MOCK) return mock.landingProductos(subdominio);
  const { data } = await api.get(`/api/landing/${encodeURIComponent(subdominio)}/productos`);
  return data;
}

/** Devuelve { url } con el enlace wa.me de la distribuidora. */
export async function obtenerWhatsappLanding(subdominio) {
  if (USAR_MOCK) return mock.landingWhatsapp(subdominio);
  const { data } = await api.get(`/api/landing/${encodeURIComponent(subdominio)}/whatsapp`);
  return data;
}

export async function obtenerIdentidadLanding(subdominio) {
  if (USAR_MOCK) return mock.landingIdentidad(subdominio);
  const { data } = await api.get(`/api/landing/${encodeURIComponent(subdominio)}/identidad`);
  return data;
}
