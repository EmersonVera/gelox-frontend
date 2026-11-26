// Esquema, valores iniciales y envío de los campos multimarca del producto
// (SKU, marca, proveedor, categoría propia y unidad con factor). Lo comparten
// NuevoProducto y EditarProducto junto con el componente CamposMultimarca.
import * as yup from 'yup';
import { presentacion, camposUnidad } from './unidadesUtils';
import { guardarHomologaciones, obtenerPlantilla } from '../../services/exportacionService';

export const esquemaMultimarca = {
  sku: yup.string().trim()
    .required('El SKU es obligatorio')
    .max(30, 'Máximo 30 caracteres')
    .matches(/^[A-Za-z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
  codigoProveedor: yup.string().trim().max(40, 'Máximo 40 caracteres'),
  marca:           yup.string().trim().required('La marca es obligatoria'),
  proveedorId:     yup.string().required('Selecciona un proveedor activo'),
  categoriaId:     yup.string().required('Selecciona una categoría'),
  categoria:       yup.string(),
  unidadCompra:    yup.string().required('Selecciona la unidad de compra'),
  factorConversion: yup.number().typeError('Ingresa un número')
    .when('unidadCompra', {
      is: 'UN',
      then: (s) => s.notRequired(),
      otherwise: (s) => s.integer('Debe ser un número entero').min(1, 'Debe ser al menos 1').required('Indica el factor'),
    }),
  unidadVenta:     yup.string().required('Selecciona la unidad de venta'),
  // ids de GET /api/unidades; los pone CamposMultimarca según el código elegido
  unidadCompraId:  yup.string().nullable(),
  unidadVentaId:   yup.string().nullable(),
};

export function valoresMultimarca(producto) {
  if (!producto) {
    return {
      sku: '', codigoProveedor: '', marca: '', proveedorId: '', categoriaId: '', categoria: '',
      unidadCompra: 'CJ', factorConversion: 24, unidadVenta: 'UN', unidadCompraId: '', unidadVentaId: '',
    };
  }
  const pr = presentacion(producto);
  const factorBackend = producto.factores?.find((f) => String(f.unidadOrigenCodigo).toUpperCase() === pr.codigo);
  return {
    sku:              producto.sku ?? producto.codigoTecnico ?? '',
    codigoProveedor:  producto.codigoProveedor ?? '',
    marca:            producto.marca ?? '',
    proveedorId:      producto.proveedorId ?? '',
    categoriaId:      producto.categoriaId ?? '',
    categoria:        producto.categoriaNombre ?? producto.categoria ?? '',
    unidadCompra:     pr.codigo,
    factorConversion: pr.factor,
    unidadVenta:      pr.venta.value,
    unidadCompraId:   factorBackend?.unidadOrigenId ?? '',
    unidadVentaId:    producto.unidadBaseId ?? '',
  };
}

/**
 * Agrega al FormData los campos multimarca con los nombres de CatalogoController:
 * sku, codigoTecnico, marca, proveedorId, categoriaId, unidadBaseId, unidadesPorCaja,
 * factores (JSON [{ unidadOrigenId, factor }]) y unidadMedida.
 */
export function agregarMultimarca(fd, data) {
  const unidad = camposUnidad(data);
  fd.append('sku', data.sku.trim());
  // Al crear, el backend exige codigoTecnico: viaja el mismo SKU.
  fd.append('codigoTecnico', data.sku.trim());
  fd.append('marca', data.marca.trim());
  fd.append('proveedorId', data.proveedorId);
  fd.append('categoriaId', data.categoriaId);
  // Compatibilidad con la columna producto.categoria (texto), que el backend aún conserva.
  if (data.categoria) fd.append('categoria', data.categoria.toUpperCase());
  fd.append('unidadMedida', unidad.unidadMedida);
  if (unidad.unidadBaseId) fd.append('unidadBaseId', unidad.unidadBaseId);
  if (unidad.unidadesPorCaja != null) fd.append('unidadesPorCaja', unidad.unidadesPorCaja);
  if (unidad.factores) fd.append('factores', JSON.stringify(unidad.factores));
}

/*
 * «Código del proveedor»: el backend no lo guarda en el producto sino como código de
 * homologación del proveedor (RF67, PUT /api/proveedores/{id}/homologaciones), que es el
 * que sale en la plantilla de exportación. Un código vacío quita la homologación.
 */

/** Código de homologación actual del producto con su proveedor ('' si no tiene). */
export async function cargarCodigoProveedor(proveedorId, productoId) {
  if (!proveedorId || !productoId) return '';
  const plantilla = await obtenerPlantilla(proveedorId);
  return plantilla?.homologaciones?.find((h) => h.productoId === productoId)?.codigo ?? '';
}

/** 409 si otro producto del proveedor ya tiene ese código. */
export async function guardarCodigoProveedor(proveedorId, productoId, codigo) {
  if (!proveedorId || !productoId) return;
  await guardarHomologaciones(proveedorId, [{ productoId, codigo: (codigo ?? '').trim() }]);
}
