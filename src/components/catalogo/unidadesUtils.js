// Unidades de compra y de venta del catálogo multimarca.
//
// Un producto se compra en una presentación (caja, bolsa, paquete...) y se vende en otra
// unidad (unidad, litro...). El factor dice cuántas unidades de venta trae una presentación:
//   - Caja (CJ): el factor es unidades_por_caja (CJ → UN), el campo que ya usa el backend.
//   - Otras presentaciones: el factor es factorConversion.

export const UNIDADES_COMPRA = [
  { value: 'CJ', label: 'Caja (CJ)',     singular: 'Caja',    plural: 'Cajas' },
  { value: 'BL', label: 'Bolsa (BL)',    singular: 'Bolsa',   plural: 'Bolsas' },
  { value: 'PC', label: 'Paquete (PC)',  singular: 'Paquete', plural: 'Paquetes' },
  { value: 'UN', label: 'Unidad (UN)',   singular: 'Unidad',  plural: 'Unidades' },
];

export const UNIDADES_VENTA = [
  { value: 'UN', label: 'Unidad', plural: 'Unidades', abrev: 'und', medida: 'Unidades' },
  { value: 'L',  label: 'Litro',  plural: 'Litros',   abrev: 'L',   medida: 'Litros' },
  { value: 'KG', label: 'Kilo',   plural: 'Kilos',    abrev: 'kg',  medida: 'Kilos' },
];

const compraPorCodigo = Object.fromEntries(UNIDADES_COMPRA.map((u) => [u.value, u]));
const ventaPorCodigo = Object.fromEntries(UNIDADES_VENTA.map((u) => [u.value, u]));

/** unidadMedida antigua ('Unidades' | 'Litros' | 'Cajas') → código de unidad de venta. */
function ventaDesdeMedida(medida) {
  const m = String(medida ?? '').toLowerCase();
  if (m.startsWith('litro')) return 'L';
  if (m.startsWith('kilo')) return 'KG';
  return 'UN';
}

/**
 * Presentación de compra de un producto, con lo que traiga el backend:
 * unidadCompra/factorConversion/unidadVenta si existen; si no, unidadesPorCaja → CJ.
 */
export function presentacion(producto) {
  const p = producto ?? {};
  const porCaja = Number(p.unidadesPorCaja) > 0 ? Number(p.unidadesPorCaja) : null;
  const codigo = p.unidadCompra ?? (porCaja ? 'CJ' : 'UN');
  const factor = codigo === 'CJ'
    ? (porCaja ?? (Number(p.factorConversion) || 1))
    : codigo === 'UN' ? 1 : (Number(p.factorConversion) || 1);
  const venta = ventaPorCodigo[p.unidadVenta ?? ventaDesdeMedida(p.unidadMedida)] ?? ventaPorCodigo.UN;
  const compra = compraPorCodigo[codigo] ?? compraPorCodigo.UN;
  return {
    codigo,
    singular: compra.singular,
    plural: compra.plural,
    factor,
    venta,
    /** true cuando se compra en una presentación que agrupa varias unidades de venta. */
    agrupa: codigo !== 'UN' && factor > 0,
  };
}

/** 'CJ · 24 und' — como se muestra en tablas. */
export function etiquetaPresentacion(producto) {
  const pr = presentacion(producto);
  if (!pr.agrupa) return pr.venta.abrev;
  return `${pr.codigo} · ${pr.factor} ${pr.venta.abrev}`;
}

/** Campos que se envían al backend para la unidad del producto (FormData). */
export function camposUnidad({ unidadCompra, factorConversion, unidadVenta }) {
  const factor = unidadCompra === 'UN' ? 1 : Number(factorConversion) || 1;
  return {
    unidadCompra,
    unidadVenta,
    factorConversion: factor,
    // Compatibilidad con el backend actual: solo la caja usa unidades_por_caja.
    unidadesPorCaja: unidadCompra === 'CJ' ? factor : null,
    unidadMedida: ventaPorCodigo[unidadVenta]?.medida ?? 'Unidades',
  };
}
