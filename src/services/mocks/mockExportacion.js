// Datos simulados de plantillas de exportación y reportes exportables (FP-15 §2.18).
// Solo se usa con VITE_USAR_MOCK_EXPORTACION=true (ver exportacionService.js). El estado vive en memoria.
// Imita las respuestas del backend (paquete exportacion).
//
// Casos para probar a mano:
//   - Guardar una plantilla GENERAR_FILAS sin columnas → 400.
//   - Guardar una columna con un campo que no existe → 400.
//   - Guardar dos homologaciones con el mismo código → 409.
//   - Un proveedor sin plantilla devuelve la estándar de Nutresa (RELLENAR_CATALOGO) con personalizada = false.
//   - Un producto sin código no bloquea nada: la plantilla se guarda y el pedido se exporta igual (FP-15 §2.18.1).
//   - Exportar un reporte sin ninguna sección → 400; fecha inicial posterior a la final → 400.

const DEMORA_MS = 300;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje, extra = {}) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, ...extra } } });

// CampoPlantilla del FP-15 §2.18.1
export const CAMPOS_PLANTILLA = [
  'CODIGO_PROVEEDOR', 'SKU', 'NOMBRE_PRODUCTO', 'UNIDAD', 'CANTIDAD', 'CANTIDAD_CAJAS',
  'CANTIDAD_UNIDADES', 'PRECIO_UNITARIO', 'SUBTOTAL', 'FECHA_PEDIDO', 'TEXTO_FIJO',
];

const PRODUCTOS = [
  { productoId: 'p-0001', sku: 'NUT-1001', nombreProducto: 'Cono Vainilla x 24',        precioUnitario: 28800, unidadesPorCaja: 24 },
  { productoId: 'p-0002', sku: 'NUT-1002', nombreProducto: 'Paleta Fresa x 30',         precioUnitario: 21000, unidadesPorCaja: 30 },
  { productoId: 'p-0003', sku: 'NUT-1003', nombreProducto: 'Helado Familiar Chocolate', precioUnitario: 15500, unidadesPorCaja: 6 },
  { productoId: 'p-0004', sku: 'NUT-1004', nombreProducto: 'Vaso Mora x 12',            precioUnitario: 9600,  unidadesPorCaja: 12 },
  { productoId: 'p-0005', sku: 'NUT-1005', nombreProducto: 'Bombón Almendra x 20',      precioUnitario: 34000, unidadesPorCaja: 20 },
];

// proveedorId → { plantilla, codigos: { productoId → código } }
const almacen = new Map();

/** Estándar de Nutresa (FP-15 §2.18.2): catalogo.xlsx, encabezados en la fila 4. */
function plantillaEstandar() {
  return {
    personalizada: false,
    modo: 'RELLENAR_CATALOGO',
    archivoBaseUrl: null,
    filaEncabezado: 4,
    encabezadoCodigo: 'Producto/SKU',
    encabezadoCantidad: 'Cantidad',
    encabezadoUnidad: 'Unidad de Medida',
    columnas: [],
    actualizadoEn: null,
  };
}

// Plantilla de ejemplo de Crem Helado (primer proveedor de proveedores.json), con las columnas del mockup.
// Marca, categoría y proveedor van como TEXTO_FIJO: son los campos que el FP-15 permite.
const col = (campo, encabezado, valorFijo = null) => ({ campo, encabezado, valorFijo });
function plantillaCremHelado() {
  return {
    personalizada: true,
    modo: 'GENERAR_FILAS',
    archivoBaseUrl: null,
    filaEncabezado: 1,
    encabezadoCodigo: null,
    encabezadoCantidad: null,
    encabezadoUnidad: null,
    actualizadoEn: '2026-11-12T10:00:00',
    columnas: [
      col('CODIGO_PROVEEDOR', 'Producto/SKU'), col('NOMBRE_PRODUCTO', 'Descripción'),
      col('UNIDAD', 'Unidad'), col('CANTIDAD', 'Cantidad'),
      col('TEXTO_FIJO', 'Proveedor', 'Meals de Colombia'), col('TEXTO_FIJO', 'Marca', 'Aloha'),
      col('TEXTO_FIJO', 'Categoría', 'Helados'), col('PRECIO_UNITARIO', 'Precio'),
    ].map((c, i) => ({ ...c, orden: i + 1 })),
  };
}

function estado(proveedorId) {
  if (!almacen.has(proveedorId)) {
    almacen.set(proveedorId, {
      plantilla: proveedorId.endsWith('4c01') ? plantillaCremHelado() : plantillaEstandar(),
      codigos: { 'p-0001': 'CONO-VAN-24', 'p-0002': 'PAL-FRE-30', 'p-0003': 'FAM-CHO-06' },
    });
  }
  return almacen.get(proveedorId);
}

function respuesta(proveedorId) {
  const { plantilla, codigos } = estado(proveedorId);
  return {
    proveedorId,
    ...plantilla,
    homologaciones: PRODUCTOS.map((p) => ({
      productoId: p.productoId,
      sku: p.sku,
      nombreProducto: p.nombreProducto,
      codigo: codigos[p.productoId] ?? '',
    })),
  };
}

function validar(plantilla) {
  if (plantilla.modo === 'GENERAR_FILAS') {
    if (!plantilla.columnas?.length) throw errorHttp(400, 'Agrega al menos una columna a la plantilla');
    for (const c of plantilla.columnas) {
      if (!CAMPOS_PLANTILLA.includes(c.campo)) throw errorHttp(400, `Campo desconocido: ${c.campo}`);
      if (!String(c.encabezado ?? '').trim()) throw errorHttp(400, 'Cada columna necesita un encabezado');
      if (c.campo === 'TEXTO_FIJO' && !String(c.valorFijo ?? '').trim()) {
        throw errorHttp(400, 'Una columna de texto fijo necesita su valor');
      }
    }
  } else if (plantilla.modo === 'RELLENAR_CATALOGO') {
    if (!(Number(plantilla.filaEncabezado) >= 1)) throw errorHttp(400, 'La fila de encabezados debe ser 1 o mayor');
    if (!String(plantilla.encabezadoCodigo ?? '').trim() || !String(plantilla.encabezadoCantidad ?? '').trim()) {
      throw errorHttp(400, 'Indica los encabezados de código y de cantidad del archivo base');
    }
  } else {
    throw errorHttp(400, 'Indica el modo de la plantilla');
  }
}

function validarCodigos(homologaciones) {
  const vistos = new Set();
  for (const h of homologaciones) {
    const codigo = String(h.codigo ?? '').trim().toLowerCase();
    if (!codigo) continue;
    if (vistos.has(codigo)) {
      throw errorHttp(409, `El código «${h.codigo}» ya está asignado a otro producto de este proveedor`);
    }
    vistos.add(codigo);
  }
}

function aplicarCodigos(proveedorId, homologaciones = []) {
  validarCodigos(homologaciones);
  const { codigos } = estado(proveedorId);
  for (const h of homologaciones) {
    const codigo = String(h.codigo ?? '').trim();
    if (codigo) codigos[h.productoId] = codigo; else delete codigos[h.productoId];
  }
}

export function obtenerPlantilla(proveedorId) {
  return esperar(respuesta(proveedorId));
}

export function guardarPlantilla(proveedorId, cuerpo) {
  try {
    validar(cuerpo);
    if (cuerpo.homologaciones) aplicarCodigos(proveedorId, cuerpo.homologaciones);
  } catch (e) {
    return Promise.reject(e);
  }
  const catalogo = cuerpo.modo === 'RELLENAR_CATALOGO';
  estado(proveedorId).plantilla = {
    personalizada: true,
    modo: cuerpo.modo,
    archivoBaseUrl: catalogo ? (cuerpo.archivoBaseUrl || null) : null,
    filaEncabezado: catalogo ? Number(cuerpo.filaEncabezado) : 1,
    encabezadoCodigo: catalogo ? cuerpo.encabezadoCodigo : null,
    encabezadoCantidad: catalogo ? cuerpo.encabezadoCantidad : null,
    encabezadoUnidad: catalogo ? (cuerpo.encabezadoUnidad || null) : null,
    actualizadoEn: new Date().toISOString(),
    columnas: catalogo ? [] : cuerpo.columnas.map((c, i) => ({
      orden: i + 1,
      campo: c.campo,
      encabezado: c.encabezado,
      valorFijo: c.campo === 'TEXTO_FIJO' ? c.valorFijo : null,
    })),
  };
  return esperar(respuesta(proveedorId));
}

export function guardarHomologaciones(proveedorId, homologaciones) {
  try { aplicarCodigos(proveedorId, homologaciones); } catch (e) { return Promise.reject(e); }
  return esperar(respuesta(proveedorId));
}

const hoy = () => new Date().toISOString().slice(0, 10);

// Misma regla del backend: la fila va en cajas si el producto tiene caja y las sueltas la completan.
function valorCelda(columna, producto, cajas, codigo) {
  const unidades = cajas * producto.unidadesPorCaja;
  switch (columna.campo) {
    case 'CODIGO_PROVEEDOR': return codigo || '';
    case 'SKU': return producto.sku;
    case 'NOMBRE_PRODUCTO': return producto.nombreProducto;
    case 'UNIDAD': return 'CJ';
    case 'CANTIDAD': return cajas;
    case 'CANTIDAD_CAJAS': return cajas;
    case 'CANTIDAD_UNIDADES': return unidades;
    case 'PRECIO_UNITARIO': return producto.precioUnitario;
    case 'SUBTOTAL': return unidades * producto.precioUnitario;
    case 'FECHA_PEDIDO': return hoy();
    case 'TEXTO_FIJO': return columna.valorFijo ?? '';
    default: return '';
  }
}

/**
 * Vista previa: { encabezados, filas, productosSinCodigo }. Se arma con la plantilla que se está
 * editando (sin guardarla) y 3 productos de ejemplo con 1, 2 y 3 cajas.
 */
export function vistaPrevia(proveedorId, cuerpo) {
  try { validar(cuerpo); } catch (e) { return Promise.reject(e); }
  const { codigos } = estado(proveedorId);
  const homologaciones = cuerpo.homologaciones ?? [];
  const codigoDe = (p) => homologaciones.find((h) => h.productoId === p.productoId)?.codigo || codigos[p.productoId] || '';
  const ejemplo = PRODUCTOS.slice(0, 3).map((p, i) => ({ producto: p, cajas: i + 1, codigo: codigoDe(p) }));
  const productosSinCodigo = ejemplo.filter((e) => !e.codigo).map((e) => e.producto.nombreProducto);

  if (cuerpo.modo === 'RELLENAR_CATALOGO') {
    const conUnidad = !!cuerpo.encabezadoUnidad;
    return esperar({
      encabezados: [cuerpo.encabezadoCodigo, 'Descripción', ...(conUnidad ? [cuerpo.encabezadoUnidad] : []), cuerpo.encabezadoCantidad],
      filas: ejemplo.map(({ producto, cajas, codigo }) => [
        codigo, producto.nombreProducto, ...(conUnidad ? ['CJ'] : []), cajas,
      ]),
      productosSinCodigo,
    });
  }
  return esperar({
    encabezados: cuerpo.columnas.map((c) => c.encabezado),
    filas: ejemplo.map(({ producto, cajas, codigo }) => cuerpo.columnas.map((c) => valorCelda(c, producto, cajas, codigo))),
    productosSinCodigo,
  });
}

/* ── Reportes exportables ── */

const SECCIONES = ['RESUMEN', 'INVERSION_INGRESOS', 'RENTABILIDAD_CANAL', 'TOP5_COMERCIANTES'];

export function exportarReporte(formato, { fechaInicio, fechaFin, secciones = [] }) {
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    return Promise.reject(errorHttp(400, 'La fecha de inicio no puede ser posterior a la fecha fin.'));
  }
  if (!secciones.length || secciones.some((s) => !SECCIONES.includes(s))) {
    return Promise.reject(errorHttp(400, 'Marca al menos una sección para exportar.'));
  }
  const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
  const nombre = `reporte-financiero-mock-${fechaInicio}-${fechaFin}.${extension}`;
  const contenido = `Archivo simulado (${extension})\nSecciones: ${secciones.join(', ')}\n`;
  const blob = new Blob([contenido], { type: 'text/plain' });
  return new Promise((resolve) => setTimeout(() => resolve({ blob, nombre }), DEMORA_MS));
}
