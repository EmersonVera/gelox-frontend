// Unidades de compra y de venta del catálogo multimarca (RF64).
//
// Un producto se compra en una presentación (caja, bolsa, paquete...) y se vende en su
// unidad base (unidad, litro...). El factor dice cuántas unidades base trae una presentación.
// Contrato del backend (CatalogoController / CatalogoProductoDTO):
//   - unidadBaseId / unidadBaseCodigo: unidad de venta (tabla unidad_medida, GET /api/unidades).
//   - Caja (CJ): el factor es unidadesPorCaja (CJ → unidad base).
//   - Otras presentaciones: factores: [{ unidadOrigenId, unidadOrigenCodigo, factor }].
// Los códigos sembrados por la migración V10 son UN, CJ y BOL; el resto se crea por distribuidora.

/** Nombres para mostrar de los códigos conocidos; un código nuevo usa el nombre del backend. */
export const UNIDADES_COMPRA = [
  { value: 'CJ',  label: 'Caja (CJ)',     singular: 'Caja',    plural: 'Cajas' },
  { value: 'BOL', label: 'Bolsa (BOL)',   singular: 'Bolsa',   plural: 'Bolsas' },
  { value: 'PC',  label: 'Paquete (PC)',  singular: 'Paquete', plural: 'Paquetes' },
  { value: 'UN',  label: 'Unidad (UN)',   singular: 'Unidad',  plural: 'Unidades' },
];

export const UNIDADES_VENTA = [
  { value: 'UN', label: 'Unidad', plural: 'Unidades', abrev: 'und', medida: 'Unidades' },
  { value: 'L',  label: 'Litro',  plural: 'Litros',   abrev: 'L',   medida: 'Litros' },
  { value: 'KG', label: 'Kilo',   plural: 'Kilos',    abrev: 'kg',  medida: 'Kilos' },
];

const compraPorCodigo = Object.fromEntries(UNIDADES_COMPRA.map((u) => [u.value, u]));
const ventaPorCodigo = Object.fromEntries(UNIDADES_VENTA.map((u) => [u.value, u]));

/** Datos de una presentación de compra por código (BL era el código anterior de bolsa). */
export function infoCompra(codigo, nombre) {
  const c = String(codigo ?? 'UN').toUpperCase();
  const conocida = compraPorCodigo[c === 'BL' ? 'BOL' : c];
  if (conocida) return conocida;
  const n = nombre ?? c;
  return { value: c, label: `${n} (${c})`, singular: n, plural: n.endsWith('s') ? n : `${n}s` };
}

/** Datos de una unidad de venta por código. */
export function infoVenta(codigo, nombre) {
  const c = String(codigo ?? 'UN').toUpperCase();
  if (ventaPorCodigo[c]) return ventaPorCodigo[c];
  const n = nombre ?? c;
  return { value: c, label: n, plural: n.endsWith('s') ? n : `${n}s`, abrev: c.toLowerCase(), medida: n };
}

/** unidadMedida antigua ('Unidades' | 'Litros' | 'Cajas') → código de unidad de venta. */
function ventaDesdeMedida(medida) {
  const m = String(medida ?? '').toLowerCase();
  if (m.startsWith('litro')) return 'L';
  if (m.startsWith('kilo')) return 'KG';
  return 'UN';
}

/**
 * Presentación de compra de un producto, con lo que traiga:
 *   - backend: unidadesPorCaja, unidadBaseCodigo, factores[]
 *   - formulario o mock: unidadCompra, factorConversion, unidadVenta
 */
export function presentacion(producto) {
  const p = producto ?? {};
  const porCaja = Number(p.unidadesPorCaja) > 0 ? Number(p.unidadesPorCaja) : null;
  const primerFactor = Array.isArray(p.factores) && p.factores.length ? p.factores[0] : null;
  const codigo = String(p.unidadCompra ?? (porCaja ? 'CJ' : primerFactor?.unidadOrigenCodigo ?? 'UN')).toUpperCase();
  let factor;
  if (codigo === 'CJ') factor = porCaja ?? (Number(p.factorConversion) || 1);
  else if (codigo === 'UN') factor = 1;
  else {
    const delBackend = p.factores?.find((f) => String(f.unidadOrigenCodigo).toUpperCase() === codigo)?.factor;
    factor = Number(p.factorConversion ?? delBackend) || 1;
  }
  const venta = infoVenta(p.unidadVenta ?? p.unidadBaseCodigo ?? ventaDesdeMedida(p.unidadMedida));
  const compra = infoCompra(codigo);
  return {
    codigo: compra.value,
    singular: compra.singular,
    plural: compra.plural,
    factor,
    venta,
    /** true cuando se compra en una presentación que agrupa varias unidades de venta. */
    agrupa: compra.value !== 'UN' && compra.value !== venta.value && factor > 0,
  };
}

/** 'CJ · 24 und' — como se muestra en tablas. */
export function etiquetaPresentacion(producto) {
  const pr = presentacion(producto);
  if (!pr.agrupa) return pr.venta.abrev;
  return `${pr.codigo} · ${pr.factor} ${pr.venta.abrev}`;
}

/**
 * Campos de unidad para el backend (FormData del producto):
 *   unidadBaseId, unidadesPorCaja (solo CJ), factores (JSON, otras presentaciones) y unidadMedida (texto anterior).
 * unidadCompraId / unidadVentaId son los ids de GET /api/unidades que pone CamposMultimarca.
 */
export function camposUnidad({ unidadCompra, factorConversion, unidadVenta, unidadCompraId, unidadVentaId }) {
  const compra = String(unidadCompra ?? 'UN').toUpperCase();
  const venta = String(unidadVenta ?? 'UN').toUpperCase();
  const factor = compra === 'UN' || compra === venta ? 1 : Number(factorConversion) || 1;
  const conFactor = compra !== 'CJ' && compra !== 'UN' && compra !== venta && !!unidadCompraId;
  return {
    unidadBaseId: unidadVentaId || null,
    unidadesPorCaja: compra === 'CJ' ? factor : null,
    // Sin unidad base no se envían factores: el backend los rechaza (400).
    factores: unidadVentaId ? (conFactor ? [{ unidadOrigenId: unidadCompraId, factor }] : []) : null,
    unidadMedida: infoVenta(venta).medida,
    factor,
  };
}
