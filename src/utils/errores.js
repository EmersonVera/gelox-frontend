// src/utils/errores.js — mensajes de error del backend compartidos por todos los módulos.
//
// RF70: cuando una distribuidora llega a una cuota de su plan, el alta (usuario, producto,
// comerciante) o la subida de un archivo responde 409 con { error: 'Cuota del plan alcanzada' }
// (CuotaService, T184). Un 409 también puede ser un dato repetido (correo, SKU, NIT), así que
// la cuota se reconoce por el texto del error o por un código, no solo por el 409.
//
// Uso:
//   import { esCuotaAlcanzada, mensajeCuota, mensajeErrorApi } from '../../utils/errores';
//   catch (err) {
//     const msg = esCuotaAlcanzada(err) ? mensajeCuota('productos', err) : mensajeErrorApi(err, 'No se pudo guardar.');
//   }

export const MENSAJE_CUOTA = 'Cuota del plan alcanzada';

const CONTACTO_CUOTA = 'Contacta al Superadministrador para cambiar de plan.';

/** Texto del error que mandó el backend, en cualquiera de los formatos que usa ({ error }, { mensaje }, { message } o texto). */
export function textoError(err) {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  return data?.error ?? data?.mensaje ?? data?.message ?? '';
}

/** true si el error es un 409 por cuota del plan (no por un dato repetido). */
export function esCuotaAlcanzada(err) {
  if (err?.response?.status !== 409) return false;
  const data = err.response.data;
  if (data && typeof data === 'object' && /CUOTA/i.test(String(data.codigo ?? data.tipo ?? ''))) return true;
  return /cuota/i.test(textoError(err));
}

/** Nombre de cada TipoCuota del backend (FP-15 §2.16.2) en el mensaje. */
const NOMBRE_CUOTA = {
  USUARIOS: 'usuarios',
  PRODUCTOS: 'productos',
  COMERCIANTES: 'comerciantes',
  ALMACENAMIENTO_MB: 'almacenamiento (MB)',
  LLAMADAS_IA_MES: 'consultas de voz',
};

/**
 * Mensaje para mostrar al Gerente cuando se alcanza una cuota.
 * recurso: 'usuarios' | 'productos' | 'comerciantes' | 'almacenamiento' (opcional, para decir qué se llenó).
 * err: el error del 409; si trae { cuota, limite, usado } (FP-15 §2.16.2) el mensaje dice cuánto se usa,
 * por ejemplo «Cuota del plan alcanzada: usuarios (5 de 5).».
 */
export function mensajeCuota(recurso, err) {
  const data = err?.response?.data;
  if (data && typeof data === 'object' && data.cuota && data.limite != null && data.usado != null) {
    const nombre = NOMBRE_CUOTA[data.cuota] ?? String(data.cuota).toLowerCase().replace(/_/g, ' ');
    const n = (v) => Number(v).toLocaleString('es-CO');
    return `${MENSAJE_CUOTA}: ${nombre} (${n(data.usado)} de ${n(data.limite)}). ${CONTACTO_CUOTA}`;
  }
  const que = {
    usuarios: 'Tu plan ya no admite más usuarios habilitados.',
    productos: 'Tu plan ya no admite más productos en el catálogo.',
    comerciantes: 'Tu plan ya no admite más comerciantes activos.',
    almacenamiento: 'Tu plan ya no tiene espacio de almacenamiento para este archivo.',
  }[recurso];
  return `${MENSAJE_CUOTA}. ${que ? `${que} ` : ''}${CONTACTO_CUOTA}`;
}

/**
 * Mensaje legible de cualquier error de axios o fetch. Ante un 409 de cuota devuelve
 * siempre «Cuota del plan alcanzada…», aunque el backend mande otro texto.
 */
export function mensajeErrorApi(err, porDefecto, recurso) {
  if (esCuotaAlcanzada(err)) return mensajeCuota(recurso, err);
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  return textoError(err) || porDefecto;
}

/**
 * Para pantallas que usan fetch en vez de axios: convierte una respuesta no OK en un error con la
 * misma forma que los de axios ({ response: { status, data } }), así sirven las funciones de arriba.
 */
export async function errorDeRespuesta(res, porDefecto = 'Error en la solicitud.') {
  const data = await res.json().catch(() => ({}));
  return Object.assign(new Error(textoError({ response: { data } }) || porDefecto), {
    response: { status: res.status, data },
  });
}
