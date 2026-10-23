// Constantes y formatos compartidos por las pantallas del Superadministrador (RF58, RF59).

export const ESTADOS_DISTRIBUIDORA = {
  ACTIVO:     { label: 'Activo',               badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PRUEBA:     { label: 'En periodo de prueba', badge: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
  SUSPENDIDO: { label: 'Suspendido por mora',  badge: 'bg-error-bg text-error-fg',      dot: 'bg-danger' },
  INACTIVO:   { label: 'Inactivo / Archivado', badge: 'bg-border text-faint',           dot: 'bg-muted' },
};

/** Orden de los filtros de la lista (igual al mockup RF59). */
export const ORDEN_ESTADOS = ['ACTIVO', 'PRUEBA', 'SUSPENDIDO', 'INACTIVO'];

/** Máquina de estados de la sección 2.12.2: INACTIVO es final. */
export const TRANSICIONES = {
  PRUEBA:     ['ACTIVO', 'SUSPENDIDO', 'INACTIVO'],
  ACTIVO:     ['SUSPENDIDO', 'INACTIVO'],
  SUSPENDIDO: ['ACTIVO', 'INACTIVO'],
  INACTIVO:   [],
};

export const PLANES = [
  { value: 'BASICO',   label: 'Básico',   descripcion: 'Plan de entrada' },
  { value: 'ESTANDAR', label: 'Estándar', descripcion: 'Plan intermedio' },
  { value: 'PREMIUM',  label: 'Premium',  descripcion: 'Plan completo' },
];

export const etiquetaPlan = (plan) => PLANES.find((p) => p.value === plan)?.label ?? plan ?? '—';

export const SUBDOMINIO_REGEX = /^[a-z0-9-]{3,30}$/;

/** Sugiere un subdominio a partir del nombre comercial: "Frío Express Cúcuta" → "frio-express-cucuta". */
export function sugerirSubdominio(nombre) {
  return String(nombre ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
}

/** URL pública de la landing de la distribuidora (RF61): mismo despliegue, ruta /tienda/{subdominio}. */
export const urlTienda = (subdominio) => `${window.location.host}/tienda/${subdominio}`;

export function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter((w) => /^[\p{L}\d]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function formatoFecha(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export function formatoFechaHora(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

/** Mensaje legible de un error de axios ({ error } es el formato del backend). */
export function mensajeError(err, porDefecto) {
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  const data = err.response.data;
  return data?.error ?? data?.mensaje ?? data?.message ?? porDefecto;
}
