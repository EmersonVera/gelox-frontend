import api from '../api/axiosConfig';
import * as mock from './mocks/mockExportacion';

// Plantillas de exportación de pedidos por proveedor y reportes financieros exportables
// (FP-15 §2.18, RF67 y RF68). Por defecto se usa el backend real (tarea 197). Los datos
// simulados (mocks/mockExportacion.js) se activan con VITE_USAR_MOCK_EXPORTACION=true en el .env.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_EXPORTACION === 'true';

export { CAMPOS_PLANTILLA } from './mocks/mockExportacion';

/*
 * Plantilla de un proveedor (GET/PUT /api/proveedores/{id}/plantilla), FP-15 §2.18.1:
 *   { proveedorId, personalizada (false = aún usa la estándar de Nutresa),
 *     modo: 'RELLENAR_CATALOGO' | 'GENERAR_FILAS',
 *     archivoBaseUrl (null = catálogo de Nutresa), filaEncabezado,
 *     encabezadoCodigo, encabezadoCantidad, encabezadoUnidad,        (solo RELLENAR_CATALOGO)
 *     columnas: [{ orden, campo, encabezado, valorFijo }],           (solo GENERAR_FILAS)
 *     homologaciones: [{ productoId, sku, nombreProducto, codigo }], actualizadoEn }
 * El PUT recibe lo mismo sin proveedorId/personalizada/actualizadoEn, y `homologaciones` como
 * [{ productoId, codigo }] (opcional: se guardan junto con la plantilla).
 *
 * Vista previa (POST .../plantilla/vista-previa, mismo cuerpo que el PUT, no guarda):
 *   { encabezados: [texto], filas: [[valor]], productosSinCodigo: [nombre] }
 *
 * Errores: 400 columnas vacías, campo desconocido o texto fijo sin valor · 404 proveedor de otra
 * distribuidora · 409 código de homologación repetido en el proveedor.
 * Un producto sin código no bloquea nada: el pedido se exporta igual y se avisa (§2.18.1).
 */

export async function obtenerPlantilla(proveedorId) {
  if (USAR_MOCK) return mock.obtenerPlantilla(proveedorId);
  const { data } = await api.get(`/api/proveedores/${proveedorId}/plantilla`);
  return data;
}

export async function guardarPlantilla(proveedorId, plantilla) {
  if (USAR_MOCK) return mock.guardarPlantilla(proveedorId, plantilla);
  const { data } = await api.put(`/api/proveedores/${proveedorId}/plantilla`, plantilla);
  return data;
}

export async function vistaPreviaPlantilla(proveedorId, plantilla) {
  if (USAR_MOCK) return mock.vistaPrevia(proveedorId, plantilla);
  const { data } = await api.post(`/api/proveedores/${proveedorId}/plantilla/vista-previa`, plantilla);
  return data;
}

/** homologaciones: [{ productoId, codigo }]. Un código vacío quita la homologación del producto. */
export async function guardarHomologaciones(proveedorId, homologaciones) {
  if (USAR_MOCK) return mock.guardarHomologaciones(proveedorId, homologaciones);
  const { data } = await api.put(`/api/proveedores/${proveedorId}/homologaciones`, { homologaciones });
  return data;
}

/* ── Reportes financieros exportables ── */

export const SECCIONES_REPORTE = [
  { value: 'RESUMEN',            label: 'Resumen' },
  { value: 'INVERSION_INGRESOS', label: 'Inversión vs ingresos' },
  { value: 'RENTABILIDAD_CANAL', label: 'Rentabilidad por canal' },
  { value: 'TOP5_COMERCIANTES',  label: 'Top 5 comerciantes' },
];

/** Nombre de archivo del encabezado Content-Disposition, o null si no viene. */
export function nombreDeContentDisposition(cabecera) {
  if (!cabecera) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecera);
  if (utf8) return decodeURIComponent(utf8[1]);
  const simple = /filename="?([^";]+)"?/i.exec(cabecera);
  return simple ? simple[1] : null;
}

/**
 * Descarga el reporte financiero en Excel o PDF con los mismos filtros de la pantalla.
 * formato: 'excel' | 'pdf' · tipo: DIA | SEMANA | MES | ANIO | RANGO · secciones: valores de SECCIONES_REPORTE.
 * Devuelve { blob, nombre }; el nombre sale de Content-Disposition
 * (reporte-financiero-{subdominio}-{desde}-{hasta}.xlsx | .pdf).
 */
export async function exportarReporteFinanciero(formato, { tipo, fechaInicio, fechaFin, secciones }) {
  if (USAR_MOCK) return mock.exportarReporte(formato, { tipo, fechaInicio, fechaFin, secciones });
  let res;
  try {
    res = await api.get(`/api/reportes/financiero/${formato}`, {
      params: { tipo, fechaInicio, fechaFin, secciones: secciones.join(',') },
      responseType: 'blob',
    });
  } catch (err) {
    // Con responseType blob el cuerpo del error también llega como Blob: se lee para mostrar su mensaje.
    if (err?.response?.data instanceof Blob) {
      try { err.response.data = JSON.parse(await err.response.data.text()); } catch { /* sin cuerpo legible */ }
    }
    throw err;
  }
  const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
  const nombre = nombreDeContentDisposition(res.headers?.['content-disposition'])
    ?? `reporte-financiero-${fechaInicio}-${fechaFin}.${extension}`;
  return { blob: res.data, nombre };
}

/** Dispara la descarga de un blob en el navegador. */
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
