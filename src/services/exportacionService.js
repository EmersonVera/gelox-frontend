import api from '../api/axiosConfig';
import * as mock from './mocks/mockExportacion';

// Plantillas de exportación de pedidos por proveedor y reportes financieros exportables
// (FP-15 §2.18, RF67 y RF68). Mientras el backend de exportación (tarea 190) no esté
// desplegado, las funciones responden con datos simulados (mocks/mockExportacion.js).
// Pasar al backend real es poner VITE_USAR_MOCK_IT3=false en el .env, sin tocar código.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_IT3 !== 'false';

export { CAMPOS_PLANTILLA } from './mocks/mockExportacion';

/*
 * Plantilla de un proveedor (GET/PUT /api/proveedores/{id}/plantilla):
 *   { proveedorId, modo: 'RELLENAR_CATALOGO' | 'GENERAR_FILAS',
 *     estado: null | 'BORRADOR' | 'ACTIVA', version, actualizadoEn, actualizadoPor,
 *     formato: 'XLSX' | 'CSV', nombreArchivo, nombreHoja, titulo   (admiten {nombreComercial} y {fecha}),
 *     archivoBaseUrl (null = catálogo de Nutresa), filaEncabezado,
 *     encabezadoCodigo, encabezadoCantidad, encabezadoUnidad,
 *     columnas: [{ orden, campo, encabezado, valorFijo }],
 *     homologaciones: [{ productoId, sku, nombreProducto, codigo }] }
 *
 * Vista previa (POST .../plantilla/vista-previa, mismo cuerpo, sin guardar):
 *   { titulo, filaEncabezado, encabezados: [texto], filas: [[valor]], productosSinCodigo: [nombre] }
 *
 * Errores: 400 columnas vacías o campo desconocido · 404 proveedor de otra distribuidora ·
 * 409 código de homologación repetido, o activar con productos sin código (estado ACTIVA).
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
