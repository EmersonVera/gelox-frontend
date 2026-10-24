// Constantes y formatos compartidos por la gestión de usuarios internos (RF62).

export const ROL_LABEL = {
  ADMINISTRADOR:        'Gerente General',
  ENCARGADO_VENTAS:     'Encargado de Ventas',
  ENCARGADO_INVENTARIO: 'Encargado de Inventarios',
};

/** Únicos roles que el Gerente puede asignar (T121: otro rol → 400). */
export const ROLES_INTERNOS = [
  {
    value: 'ENCARGADO_VENTAS',
    label: 'Encargado de Ventas',
    descripcion: 'Pedidos de ventanilla y rurales, planillas de comerciantes y reporte diario.',
  },
  {
    value: 'ENCARGADO_INVENTARIO',
    label: 'Encargado de Inventarios',
    descripcion: 'Catálogo, entradas, mermas y pedidos a proveedor.',
  },
];

export const ROLES_PERMITIDOS = ROLES_INTERNOS.map((r) => r.value);

export const esActivo = (u) => u?.habilitado !== false && u?.activo !== false;

/**
 * Gerente titular = distribuidora.gerente_titular_id; el backend lo expone en esGerenteTitular (T121).
 * Mientras ese campo no llegue, el Gerente General se trata igual: no se edita ni se deshabilita desde aquí.
 */
export const esGerenteTitular = (u) => u?.esGerenteTitular ?? u?.rol === 'ADMINISTRADOR';

/** Usuarios que RF62 no deja tocar: el titular y cualquier rol fuera de Ventas e Inventarios. */
export const sinAcciones = (u) => esGerenteTitular(u) || !ROLES_PERMITIDOS.includes(u?.rol);

export function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** El backend responde los errores de /api/usuarios como texto plano (UsuarioController) o como { error }. */
export function mensajeError(err, porDefecto) {
  if (!err?.response) return 'Sin conexión con el servidor. Intenta de nuevo.';
  const data = err.response.data;
  const msg = (typeof data === 'string' ? data : undefined)
    ?? data?.error ?? data?.mensaje ?? data?.message;
  return msg || porDefecto;
}

/** 400 por rol no permitido («Solo se permiten los roles de Ventas e Inventarios»). */
export function esErrorDeRol(err) {
  if (err?.response?.status !== 400) return false;
  return /\brol/i.test(mensajeError(err, ''));
}

/** 400 o 409 por correo repetido («El correo ya está en uso»). */
export function esErrorDeCorreo(err) {
  return /correo|email|duplicado/i.test(mensajeError(err, ''));
}
