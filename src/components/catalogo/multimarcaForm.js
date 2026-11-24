// Esquema, valores iniciales y envío de los campos multimarca del producto
// (SKU, marca, proveedor, categoría propia y unidad con factor). Lo comparten
// NuevoProducto y EditarProducto junto con el componente CamposMultimarca.
import * as yup from 'yup';
import { presentacion, camposUnidad } from './unidadesUtils';

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
};

export function valoresMultimarca(producto) {
  if (!producto) {
    return {
      sku: '', codigoProveedor: '', marca: '', proveedorId: '', categoriaId: '', categoria: '',
      unidadCompra: 'CJ', factorConversion: 24, unidadVenta: 'UN',
    };
  }
  const pr = presentacion(producto);
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
  };
}

/** Agrega al FormData los campos multimarca, más los que el backend actual ya entiende. */
export function agregarMultimarca(fd, data) {
  const unidad = camposUnidad(data);
  fd.append('sku', data.sku.trim());
  // El backend actual identifica el producto por codigoTecnico: viaja el mismo SKU.
  fd.append('codigoTecnico', data.sku.trim());
  if (data.codigoProveedor) fd.append('codigoProveedor', data.codigoProveedor.trim());
  fd.append('marca', data.marca.trim());
  fd.append('proveedorId', data.proveedorId);
  fd.append('categoriaId', data.categoriaId);
  // Compatibilidad: el backend actual filtra por el nombre de la categoría en mayúsculas.
  if (data.categoria) fd.append('categoria', data.categoria.toUpperCase());
  fd.append('unidadCompra', unidad.unidadCompra);
  fd.append('factorConversion', unidad.factorConversion);
  fd.append('unidadVenta', unidad.unidadVenta);
  fd.append('unidadMedida', unidad.unidadMedida);
  if (unidad.unidadesPorCaja != null) fd.append('unidadesPorCaja', unidad.unidadesPorCaja);
}
