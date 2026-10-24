// Datos simulados de usuarios internos de una distribuidora (RF62).
// Respeta la forma de UsuarioResponseDTO con el campo esGerenteTitular que agrega T121,
// y los errores en texto plano de UsuarioController. Guarda el estado en memoria
// mientras la pestaña siga abierta.
//
// Usuario: { id, nombre, correo, rol, activo, ultimoAcceso, esGerenteTitular }
//
// Casos para probar a mano:
//   - /usuarios/00000000-0000-0000-0000-0000000000b2/editar → usuario de otra distribuidora: 404.
//   - Correo ya registrado → 400 «El correo ya está en uso».
//   - Rol distinto de Ventas o Inventarios → 400 «Solo se permiten los roles de Ventas e Inventarios».
//   - Deshabilitar o cambiar de rol al gerente titular → 400.

const DEMORA_MS = 400;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve({ data: structuredClone(valor) }), DEMORA_MS));

const errorHttp = (status, mensaje) =>
  Promise.reject(Object.assign(new Error(mensaje), { response: { status, data: mensaje } }));

const ROLES_PERMITIDOS = ['ENCARGADO_VENTAS', 'ENCARGADO_INVENTARIO'];

const haceDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(9, 40, 0, 0);
  return d.toISOString();
};

/** Mágico Sabor: la distribuidora del Gerente que inició sesión. */
const store = new Map([
  {
    id: '7c1e2a40-5b3d-4f6e-9a8b-0c1d2e3f4a01', nombre: 'Ayde Arévalo', correo: 'gerencia@magicosabor.co',
    rol: 'ADMINISTRADOR', activo: true, ultimoAcceso: haceDias(2), esGerenteTitular: true,
  },
  {
    id: '7c1e2a40-5b3d-4f6e-9a8b-0c1d2e3f4a02', nombre: 'Maria Bautista', correo: 'ventas@magicosabor.co',
    rol: 'ENCARGADO_VENTAS', activo: true, ultimoAcceso: haceDias(2), esGerenteTitular: false,
  },
  {
    id: '7c1e2a40-5b3d-4f6e-9a8b-0c1d2e3f4a03', nombre: 'Emerson Vera', correo: 'inventarios@magicosabor.co',
    rol: 'ENCARGADO_INVENTARIO', activo: true, ultimoAcceso: haceDias(7), esGerenteTitular: false,
  },
  {
    id: '7c1e2a40-5b3d-4f6e-9a8b-0c1d2e3f4a04', nombre: 'Jesus Gabriel', correo: 'caja@magicosabor.co',
    rol: 'ENCARGADO_VENTAS', activo: false, ultimoAcceso: null, esGerenteTitular: false,
  },
].map((u) => [u.id, u]));

/** Usuarios de otra distribuidora: existen, pero el filtro por tenant los oculta (404). */
const OTRA_DISTRIBUIDORA = new Map([
  ['00000000-0000-0000-0000-0000000000b2', { correo: 'ventas@heladosdelnorte.co' }],
]);

const normalizar = (texto) => String(texto ?? '').trim().toLowerCase();

const correoEnUso = (correo, excepto) =>
  [...store.values(), ...OTRA_DISTRIBUIDORA.values()]
    .some((u) => u !== excepto && normalizar(u.correo) === normalizar(correo));

/** Acepta el body JSON o el FormData con foto que envían las pantallas. */
const leer = (datos) => (datos instanceof FormData ? Object.fromEntries(datos.entries()) : datos ?? {});

function buscar(id) {
  return store.get(id) ?? null;
}

/* ── Funciones simuladas (misma firma que usuariosService) ── */

export function listar() {
  return esperar([...store.values()]);
}

export function obtener(id) {
  const u = buscar(id);
  return u ? esperar(u) : errorHttp(404, 'Usuario no encontrado');
}

export function crear(datos) {
  const { nombre, correo, contrasenaTemporal, rol } = leer(datos);
  if (!ROLES_PERMITIDOS.includes(rol)) return errorHttp(400, 'Solo se permiten los roles de Ventas e Inventarios');
  if (!contrasenaTemporal) return errorHttp(400, 'La contraseña temporal es obligatoria');
  if (correoEnUso(correo)) return errorHttp(400, 'El correo ya está en uso');

  const nuevo = {
    id: crypto.randomUUID(), nombre: nombre.trim(), correo: correo.trim(), rol,
    activo: true, ultimoAcceso: null, esGerenteTitular: false,
  };
  store.set(nuevo.id, nuevo);
  return esperar(nuevo);
}

export function editar(id, datos) {
  const u = buscar(id);
  if (!u) return errorHttp(404, 'Usuario no encontrado');
  const { nombre, correo, rol } = leer(datos);
  if (u.esGerenteTitular) return errorHttp(400, 'El gerente titular no se puede cambiar de rol');
  if (!ROLES_PERMITIDOS.includes(rol)) return errorHttp(400, 'Solo se permiten los roles de Ventas e Inventarios');
  if (correoEnUso(correo, u)) return errorHttp(400, 'El correo ya está en uso');

  Object.assign(u, { nombre: nombre.trim(), correo: correo.trim(), rol });
  return esperar(u);
}

export function deshabilitar(id) {
  const u = buscar(id);
  if (!u) return errorHttp(404, 'Usuario no encontrado');
  if (u.esGerenteTitular) return errorHttp(400, 'El gerente titular no se puede deshabilitar');
  u.activo = false;
  return esperar(null);
}

export function habilitar(id) {
  const u = buscar(id);
  if (!u) return errorHttp(404, 'Usuario no encontrado');
  u.activo = true;
  return esperar(null);
}
