// Formatos y cálculos compartidos por Proveedores, Catálogo y Generar Pedido.

export const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

const PESOS_DV = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Dígito de verificación DIAN de un NIT (sin puntos ni DV). '' si no hay dígitos. */
export function calcularDV(nit) {
  const digitos = soloDigitos(nit);
  if (!digitos) return '';
  const suma = digitos
    .split('')
    .reverse()
    .reduce((acc, d, i) => acc + Number(d) * (PESOS_DV[i] ?? 0), 0);
  const residuo = suma % 11;
  return String(residuo > 1 ? 11 - residuo : residuo);
}

/** '890301884' → '890.301.884' */
export const formatoNitSinDV = (nit) => soloDigitos(nit).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** '890301884' → '890.301.884-5' */
export function formatoNit(nit) {
  const digitos = soloDigitos(nit);
  return digitos ? `${formatoNitSinDV(digitos)}-${calcularDV(digitos)}` : '—';
}

export const formatoCOP = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');

export function iniciales(nombre) {
  if (!nombre) return '?';
  const palabras = nombre.split(' ').filter(Boolean);
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return palabras.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const dias = (n) => `${n} día${Number(n) === 1 ? '' : 's'}`;
export const formatoDias = dias;

/** Fecha tras sumar N días hábiles (lunes a viernes) a partir de hoy. */
export function sumarDiasHabiles(n, desde = new Date()) {
  const fecha = new Date(desde);
  let restantes = Math.max(0, Number(n) || 0);
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1);
    const d = fecha.getDay();
    if (d !== 0 && d !== 6) restantes -= 1;
  }
  return fecha;
}

export const formatoFechaCorta = (fecha) =>
  new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha);

export function formatoFechaLarga(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

/** Mensaje legible de un error de axios: { error } | { mensaje } | { campo: mensaje }. */
export function mensajeError(err, porDefecto) {
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  if (err.response.status === 403) return 'No tienes permiso para esta acción.';
  const data = err.response.data;
  if (typeof data === 'string' && data.trim()) return data;
  const validacion = data && typeof data === 'object' ? Object.values(data).find((v) => typeof v === 'string') : null;
  return data?.error ?? data?.mensaje ?? data?.message ?? validacion ?? porDefecto;
}

/**
 * Productos de un proveedor. Mientras el catálogo del backend no traiga proveedorId
 * en ningún producto, no hay forma de saber a quién pertenecen: se devuelven todos
 * y `sinAsignar` queda en true para avisarlo en pantalla.
 */
export function productosDeProveedor(productos, proveedorId) {
  const conProveedor = productos.some((p) => p.proveedorId != null);
  if (!conProveedor) return { lista: productos, sinAsignar: true };
  return { lista: productos.filter((p) => p.proveedorId === proveedorId), sinAsignar: false };
}
