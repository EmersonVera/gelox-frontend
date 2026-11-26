// Datos simulados de proveedores y categorías propias del catálogo multimarca.
// Los datos de partida salen de proveedores.json (reemplazable por el JSON de Daniela);
// este módulo solo guarda el estado en memoria mientras la pestaña siga abierta,
// para que crear, editar o desactivar un proveedor se refleje en todas las vistas.
//
// Casos para probar a mano:
//   - NIT de un proveedor existente (sin importar puntos o DV) → 409.
//   - Categoría con un nombre que ya existe (sin importar tildes ni mayúsculas) → 409.
import datos from './proveedores.json';

const DEMORA_MS = 350;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje, extra = {}) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, ...extra } } });

const normalizar = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const soloDigitos = (nit) => String(nit ?? '').replace(/\D/g, '');

const proveedores = new Map(datos.proveedores.map((p) => [p.id, { ...p }]));
const categorias = new Map(datos.categorias.map((c) => [c.id, { ...c }]));

/* ── Proveedores ── */

export function listar({ q, activo } = {}) {
  const busqueda = normalizar(q);
  const digitos = soloDigitos(q);
  const coincide = (p) =>
    [p.nombreComercial, p.razonSocial].some((campo) => normalizar(campo).includes(busqueda))
    || (digitos.length > 0 && p.nit.includes(digitos));
  const lista = [...proveedores.values()]
    .filter((p) => activo == null || p.activo === activo)
    .filter((p) => !busqueda || coincide(p))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombreComercial.localeCompare(b.nombreComercial, 'es'));
  return esperar(lista);
}

export function obtener(id) {
  const p = proveedores.get(id);
  if (!p) return Promise.reject(errorHttp(404, 'Proveedor no encontrado'));
  return esperar(p);
}

function nitRepetido(nit, idPropio) {
  return [...proveedores.values()].some((p) => p.id !== idPropio && soloDigitos(p.nit) === soloDigitos(nit));
}

export function crear(datosProveedor) {
  if (nitRepetido(datosProveedor.nit)) {
    return Promise.reject(errorHttp(409, 'Ya existe un proveedor con ese NIT', { campo: 'nit' }));
  }
  const nuevo = {
    activo: true,
    plantilla: '',
    ...datosProveedor,
    nit: soloDigitos(datosProveedor.nit),
    id: crypto.randomUUID(),
    productosAsociados: 0,
    createdAt: new Date().toISOString(),
  };
  proveedores.set(nuevo.id, nuevo);
  return esperar(nuevo);
}

export function actualizar(id, cambios) {
  const p = proveedores.get(id);
  if (!p) return Promise.reject(errorHttp(404, 'Proveedor no encontrado'));
  if (cambios.nit != null && nitRepetido(cambios.nit, id)) {
    return Promise.reject(errorHttp(409, 'Ya existe un proveedor con ese NIT', { campo: 'nit' }));
  }
  Object.assign(p, cambios, cambios.nit != null ? { nit: soloDigitos(cambios.nit) } : {});
  return esperar(p);
}

export function cambiarEstado(id, activo) {
  const p = proveedores.get(id);
  if (!p) return Promise.reject(errorHttp(404, 'Proveedor no encontrado'));
  p.activo = !!activo;
  return esperar(p);
}

/* ── Unidades de medida (UnidadMedidaDTO) ── */

const UNIDADES = [
  { id: 'd0a1b2c3-0000-4000-8000-000000000001', codigo: 'UN',  nombre: 'Unidad' },
  { id: 'd0a1b2c3-0000-4000-8000-000000000002', codigo: 'CJ',  nombre: 'Caja' },
  { id: 'd0a1b2c3-0000-4000-8000-000000000003', codigo: 'BOL', nombre: 'Bolsa' },
  { id: 'd0a1b2c3-0000-4000-8000-000000000004', codigo: 'PC',  nombre: 'Paquete' },
  { id: 'd0a1b2c3-0000-4000-8000-000000000005', codigo: 'L',   nombre: 'Litro' },
];

export function listarUnidades() {
  return esperar(UNIDADES);
}

/* ── Categorías propias ── */

export function listarCategorias() {
  const lista = [...categorias.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return esperar(lista);
}

export function crearCategoria(nombre) {
  const limpio = String(nombre ?? '').trim();
  if (!limpio) return Promise.reject(errorHttp(400, 'El nombre de la categoría es obligatorio'));
  if ([...categorias.values()].some((c) => normalizar(c.nombre) === normalizar(limpio))) {
    return Promise.reject(errorHttp(409, 'Ya existe una categoría con ese nombre', { campo: 'nombre' }));
  }
  const nueva = { id: crypto.randomUUID(), nombre: limpio };
  categorias.set(nueva.id, nueva);
  return esperar(nueva);
}
