// Datos simulados de plantillas de exportación y reportes exportables (FP-15 §2.18).
// Se usa mientras USAR_MOCK sea true en exportacionService.js. El estado vive en memoria.
//
// Casos para probar a mano:
//   - Guardar una plantilla GENERAR_FILAS sin columnas → 400.
//   - Guardar una columna con un campo que no existe → 400.
//   - Guardar dos homologaciones con el mismo código → 409.
//   - Un proveedor sin plantilla devuelve la de Nutresa (RELLENAR_CATALOGO) sin versión ni estado.
//   - Activar una plantilla con productos sin código de homologación → 409 (solo se puede guardar borrador).
//   - Exportar un reporte sin ninguna sección → 400; fecha inicial posterior a la final → 400.

const DEMORA_MS = 300;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje, extra = {}) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje, ...extra } } });

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

function plantillaPorDefecto() {
  return {
    estado: null, // null = nunca se guardó; 'BORRADOR' | 'ACTIVA'
    version: 0,
    actualizadoEn: null,
    actualizadoPor: null,
    modo: 'RELLENAR_CATALOGO',
    formato: 'XLSX',
    nombreArchivo: 'Pedido_{nombreComercial}_{fecha}',
    nombreHoja: 'Pedido',
    titulo: 'Formato de pedido masivo — {nombreComercial}',
    archivoBaseUrl: null,
    filaEncabezado: 4,
    encabezadoCodigo: 'Producto/SKU',
    encabezadoCantidad: 'Cantidad',
    encabezadoUnidad: 'Unidad de Medida',
    columnas: [],
  };
}

// Plantilla de ejemplo de Crem Helado (primer proveedor de proveedores.json), como en el mockup.
const col = (campo, encabezado, valorFijo = null) => ({ campo, encabezado, valorFijo });
function plantillaCremHelado() {
  return {
    ...plantillaPorDefecto(),
    estado: 'ACTIVA',
    version: 3,
    actualizadoEn: '2026-11-12T10:00:00',
    actualizadoPor: 'Carlos Pérez',
    modo: 'GENERAR_FILAS',
    filaEncabezado: 4,
    columnas: [
      col('CODIGO_PROVEEDOR', 'Producto/SKU'), col('NOMBRE_PRODUCTO', 'Descripción'),
      col('UNIDAD', 'Unidad'), col('CANTIDAD', 'Cantidad'),
      col('TEXTO_FIJO', 'Proveedor', 'Meals de Colombia'), col('TEXTO_FIJO', 'Marca', 'Aloha'),
      col('TEXTO_FIJO', 'Categoría', 'Helados'), col('TEXTO_FIJO', 'Subcat.', 'Helados'),
      col('PRECIO_UNITARIO', 'Precio'),
    ].map((c, i) => ({ ...c, orden: i + 1 })),
  };
}

function estado(proveedorId) {
  if (!almacen.has(proveedorId)) {
    almacen.set(proveedorId, {
      plantilla: proveedorId.endsWith('4c01') ? plantillaCremHelado() : plantillaPorDefecto(),
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
  if (!['XLSX', 'CSV'].includes(plantilla.formato ?? 'XLSX')) throw errorHttp(400, 'Formato de archivo desconocido.');
  if (!String(plantilla.nombreArchivo ?? '').trim()) throw errorHttp(400, 'Indica el nombre del archivo.');
  if (plantilla.modo === 'GENERAR_FILAS') {
    if (!plantilla.columnas?.length) throw errorHttp(400, 'Agrega al menos una columna a la plantilla.');
    for (const c of plantilla.columnas) {
      if (!CAMPOS_PLANTILLA.includes(c.campo)) throw errorHttp(400, `Campo desconocido: ${c.campo}`);
      if (!String(c.encabezado ?? '').trim()) throw errorHttp(400, 'Cada columna necesita un encabezado.');
      if (c.campo === 'TEXTO_FIJO' && !String(c.valorFijo ?? '').trim()) {
        throw errorHttp(400, 'Una columna de texto fijo necesita su valor.');
      }
    }
  } else if (plantilla.modo === 'RELLENAR_CATALOGO') {
    if (!(Number(plantilla.filaEncabezado) >= 1)) throw errorHttp(400, 'La fila de encabezados debe ser 1 o mayor.');
    if (!String(plantilla.encabezadoCodigo ?? '').trim() || !String(plantilla.encabezadoCantidad ?? '').trim()) {
      throw errorHttp(400, 'Indica los encabezados de código y de cantidad.');
    }
  } else {
    throw errorHttp(400, 'Modo de plantilla desconocido.');
  }
}

function validarCodigos(homologaciones) {
  const vistos = new Set();
  for (const h of homologaciones) {
    const codigo = String(h.codigo ?? '').trim().toLowerCase();
    if (!codigo) continue;
    if (vistos.has(codigo)) throw errorHttp(409, `El código «${h.codigo}» está repetido para este proveedor.`);
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
  const plantilla = { ...cuerpo };
  delete plantilla.homologaciones;
  const previa = estado(proveedorId).plantilla;
  // Según FP-15 §2.18.1 y Plan de trabajo (F12), los productos sin código no bloquean; se reportan al exportar.
  estado(proveedorId).plantilla = {
    ...plantilla,
    estado: plantilla.estado === 'ACTIVA' ? 'ACTIVA' : 'BORRADOR',
    version: (previa.version ?? 0) + 1,
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: 'Tú',
    columnas: (plantilla.columnas ?? []).map((c, i) => ({ ...c, orden: i + 1 })),
  };
  return esperar(respuesta(proveedorId));
}

export function guardarHomologaciones(proveedorId, homologaciones) {
  try { aplicarCodigos(proveedorId, homologaciones); } catch (e) { return Promise.reject(e); }
  return esperar(respuesta(proveedorId));
}

const hoy = () => new Date().toISOString().slice(0, 10);

function valorCelda(columna, producto, cantidadCajas, codigo) {
  const unidades = cantidadCajas * producto.unidadesPorCaja;
  switch (columna.campo) {
    case 'CODIGO_PROVEEDOR': return codigo || '(sin código)';
    case 'SKU': return producto.sku;
    case 'NOMBRE_PRODUCTO': return producto.nombreProducto;
    case 'UNIDAD': return 'CJ';
    case 'CANTIDAD': return cantidadCajas;
    case 'CANTIDAD_CAJAS': return cantidadCajas;
    case 'CANTIDAD_UNIDADES': return unidades;
    case 'PRECIO_UNITARIO': return producto.precioUnitario;
    case 'SUBTOTAL': return unidades * producto.precioUnitario;
    case 'FECHA_PEDIDO': return hoy();
    case 'TEXTO_FIJO': return columna.valorFijo ?? '';
    default: return '';
  }
}

/**
 * Vista previa tipo hoja de cálculo: { titulo, filaEncabezado, encabezados, filas, productosSinCodigo }.
 * Se arma con la plantilla que se está editando (sin guardarla) y 2 productos de ejemplo.
 */
export function vistaPrevia(proveedorId, cuerpo) {
  try { validar(cuerpo); } catch (e) { return Promise.reject(e); }
  const { codigos } = estado(proveedorId);
  const homologaciones = cuerpo.homologaciones ?? [];
  const codigoDe = (p) => homologaciones.find((h) => h.productoId === p.productoId)?.codigo || codigos[p.productoId] || '';
  const ejemplo = PRODUCTOS.slice(0, 2).map((p, i) => ({ producto: p, cajas: i + 1, codigo: codigoDe(p) }));
  const productosSinCodigo = ejemplo.filter((e) => !e.codigo).map((e) => e.producto.nombreProducto);
  const titulo = String(cuerpo.titulo ?? '');

  if (cuerpo.modo === 'RELLENAR_CATALOGO') {
    return esperar({
      titulo,
      filaEncabezado: cuerpo.filaEncabezado,
      encabezados: [cuerpo.encabezadoCodigo, 'Descripción', cuerpo.encabezadoUnidad || 'Unidad de Medida', cuerpo.encabezadoCantidad],
      filas: ejemplo.map(({ producto, cajas, codigo }) => [codigo || '(sin código)', producto.nombreProducto, 'CJ', cajas]),
      productosSinCodigo,
    });
  }
  return esperar({
    titulo,
    filaEncabezado: cuerpo.filaEncabezado,
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
