// src/components/catalogo/CamposMultimarca.jsx
// SKU, marca, proveedor (solo activos), categoría propia (con opción de crear) y
// unidad de compra con factor. Se usa dentro del useForm de NuevoProducto y EditarProducto.
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import CustomSelect from '../ui/CustomSelect';
import {
  listarProveedoresActivos, listarCategorias, crearCategoria, listarUnidades,
} from '../../services/proveedoresService';
import { mensajeError, formatoCOP } from '../inventarios/proveedoresUtils';
import { UNIDADES_COMPRA, UNIDADES_VENTA, infoCompra, infoVenta } from './unidadesUtils';

const inputClass = "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
const labelClass = "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block";
const errorClass = "font-['Inter'] text-[12px] text-[#dc2626] mt-1";
const ayudaClass = "font-['Inter'] text-[11px] text-[#a8a29e] mt-1";

const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function CamposMultimarca({ register, control, errors, watch, setValue }) {
  const [proveedores, setProveedores] = useState([]);
  const [categorias, setCategorias]   = useState([]);
  const [unidades, setUnidades]       = useState([]);   // GET /api/unidades: { id, codigo, nombre }
  const [errorCarga, setErrorCarga]   = useState('');
  const [creando, setCreando]         = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [guardandoCat, setGuardandoCat]     = useState(false);
  const [errorCategoria, setErrorCategoria] = useState('');

  const proveedorId  = watch('proveedorId');
  const categoriaId  = watch('categoriaId');
  const categoriaNom = watch('categoria');
  const unidadCompra = watch('unidadCompra');
  const unidadVenta  = watch('unidadVenta');
  const factor       = Number(watch('factorConversion')) || 0;
  const precioCosto  = Number(watch('precioCosto')) || 0;
  const precioVenta  = Number(watch('precioVenta')) || 0;

  useEffect(() => {
    let vivo = true;
    Promise.all([listarProveedoresActivos(), listarCategorias()])
      .then(([provs, cats]) => {
        if (!vivo) return;
        setProveedores(provs);
        setCategorias(cats);
      })
      .catch((err) => { if (vivo) setErrorCarga(mensajeError(err, 'No se pudieron cargar los proveedores y categorías.')); });
    listarUnidades()
      .then((lista) => { if (vivo) setUnidades(lista); })
      .catch(() => { /* sin unidades: se usan los códigos conocidos y la unidad base por defecto (UN) */ });
    return () => { vivo = false; };
  }, []);

  // El backend recibe ids (unidadBaseId y factores[].unidadOrigenId): se toman del código elegido.
  useEffect(() => {
    if (unidades.length === 0) return;
    const idDe = (codigo) => unidades.find((u) => String(u.codigo).toUpperCase() === String(codigo).toUpperCase())?.id ?? '';
    setValue('unidadCompraId', idDe(unidadCompra));
    setValue('unidadVentaId', idDe(unidadVenta));
  }, [unidades, unidadCompra, unidadVenta, setValue]);

  const opcionesCompra = unidades.length
    ? unidades.map((u) => ({ value: String(u.codigo).toUpperCase(), label: infoCompra(u.codigo, u.nombre).label }))
    : UNIDADES_COMPRA.map(({ value, label }) => ({ value, label }));
  const opcionesVenta = unidades.length
    ? unidades.filter((u) => String(u.codigo).toUpperCase() !== 'CJ')
      .map((u) => ({ value: String(u.codigo).toUpperCase(), label: infoVenta(u.codigo, u.nombre).label }))
    : UNIDADES_VENTA.map(({ value, label }) => ({ value, label }));

  // Productos anteriores solo traen el nombre de la categoría: se enlaza con la categoría propia.
  useEffect(() => {
    if (categoriaId || !categoriaNom || categorias.length === 0) return;
    const encontrada = categorias.find((c) => normalizar(c.nombre) === normalizar(categoriaNom));
    if (encontrada) setValue('categoriaId', encontrada.id);
  }, [categorias, categoriaId, categoriaNom, setValue]);

  const proveedorInactivo = proveedorId && proveedores.length > 0 && !proveedores.some((p) => p.id === proveedorId);

  const elegirCategoria = (id) => {
    const cat = categorias.find((c) => c.id === id);
    setValue('categoriaId', id, { shouldValidate: true });
    setValue('categoria', cat?.nombre ?? '');
  };

  const agregarCategoria = async () => {
    const nombre = nuevaCategoria.trim();
    if (!nombre) { setErrorCategoria('Escribe el nombre de la categoría.'); return; }
    setGuardandoCat(true);
    setErrorCategoria('');
    try {
      const creada = await crearCategoria(nombre);
      setCategorias((prev) => [...prev, creada].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
      setValue('categoriaId', creada.id, { shouldValidate: true });
      setValue('categoria', creada.nombre);
      setNuevaCategoria('');
      setCreando(false);
    } catch (err) {
      setErrorCategoria(mensajeError(err, 'No se pudo crear la categoría.'));
    } finally {
      setGuardandoCat(false);
    }
  };

  const compra = infoCompra(unidadCompra, unidades.find((u) => u.codigo === unidadCompra)?.nombre);
  const venta  = infoVenta(unidadVenta, unidades.find((u) => u.codigo === unidadVenta)?.nombre);
  const agrupa = unidadCompra !== 'UN' && unidadCompra !== unidadVenta;
  const factorEfectivo = agrupa ? factor : 1;

  // Margen: lo que se vende con una presentación frente a lo que cuesta.
  const ventaPorPresentacion = precioVenta * factorEfectivo;
  const margen = ventaPorPresentacion > 0 && precioCosto > 0
    ? ((ventaPorPresentacion - precioCosto) / ventaPorPresentacion) * 100
    : null;
  const margenPorUnidad = factorEfectivo > 0 && precioCosto > 0 ? precioVenta - precioCosto / factorEfectivo : null;

  return (
    <div className="flex flex-col gap-5">
      {errorCarga && (
        <div className="px-4 py-3 rounded-xl bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] text-sm">{errorCarga}</div>
      )}

      {/* SKU + código del proveedor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>SKU propio *</label>
          <input {...register('sku')} placeholder="GLX-CV-004" className={`${inputClass} font-mono uppercase`} />
          {errors.sku
            ? <p className={errorClass}>{errors.sku.message}</p>
            : <p className={ayudaClass}>Único dentro de tu distribuidora.</p>}
        </div>
        <div>
          <label className={labelClass}>Código del proveedor</label>
          <input {...register('codigoProveedor')} placeholder="1047212" className={`${inputClass} font-mono`} />
          {errors.codigoProveedor
            ? <p className={errorClass}>{errors.codigoProveedor.message}</p>
            : <p className={ayudaClass}>Se guarda como código de homologación del proveedor y sale en su plantilla de exportación.</p>}
        </div>
      </div>

      {/* Proveedor + marca */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Proveedor *</label>
          <Controller
            control={control}
            name="proveedorId"
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                onChange={field.onChange}
                placeholder={proveedores.length ? 'Seleccionar...' : 'Sin proveedores activos'}
                searchable={proveedores.length > 6}
                options={proveedores.map((p) => ({ value: p.id, label: p.nombreComercial }))}
              />
            )}
          />
          {errors.proveedorId
            ? <p className={errorClass}>{errors.proveedorId.message}</p>
            : proveedorInactivo
              ? <p className={errorClass}>El proveedor actual está inactivo: elige uno activo.</p>
              : <p className={ayudaClass}>Solo se muestran los proveedores activos.</p>}
        </div>
        <div>
          <label className={labelClass}>Marca *</label>
          <input {...register('marca')} placeholder="Ej. Casero" className={inputClass} />
          {errors.marca
            ? <p className={errorClass}>{errors.marca.message}</p>
            : <p className={ayudaClass}>Puede diferir del proveedor.</p>}
        </div>
      </div>

      {/* Categoría propia */}
      <div>
        <label className={labelClass}>Categoría propia *</label>
        <div className="flex gap-2">
          <CustomSelect
            className="flex-1"
            value={categoriaId}
            onChange={elegirCategoria}
            options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
            searchable={categorias.length > 8}
          />
          {!creando && (
            <button
              type="button"
              onClick={() => { setCreando(true); setErrorCategoria(''); }}
              className="shrink-0 px-4 rounded-[8px] border border-[#e7e5e4] font-['Inter'] font-semibold text-[14px] text-[#1b1b1c] hover:border-[#9e2016] hover:text-[#9e2016] transition-colors cursor-pointer"
            >
              + Crear
            </button>
          )}
        </div>
        {errors.categoriaId && <p className={errorClass}>{errors.categoriaId.message}</p>}

        {creando && (
          <div className="mt-2 border border-dashed border-[#fca5a5] bg-[#fffafa] rounded-[10px] p-2.5">
            <div className="flex gap-2">
              <input
                autoFocus
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarCategoria(); } }}
                placeholder="Nombre de la categoría"
                maxLength={40}
                className="flex-1 min-w-0 bg-white border border-[#e7e5e4] rounded-[8px] px-3 py-2 font-['Inter'] text-[14px] outline-none focus:border-[#9e2016] focus:ring-2 focus:ring-[#9e2016]/20"
              />
              <button
                type="button"
                onClick={agregarCategoria}
                disabled={guardandoCat}
                className="px-4 rounded-[8px] bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-60 text-white font-['Inter'] font-semibold text-[13px] cursor-pointer transition-colors"
              >
                {guardandoCat ? 'Agregando…' : 'Agregar'}
              </button>
              <button
                type="button"
                aria-label="Cancelar nueva categoría"
                onClick={() => { setCreando(false); setNuevaCategoria(''); setErrorCategoria(''); }}
                className="w-9 rounded-[8px] text-[#78716c] hover:bg-[#f6f3f3] cursor-pointer"
              >
                ✕
              </button>
            </div>
            {errorCategoria
              ? <p className={errorClass}>{errorCategoria}</p>
              : <p className={ayudaClass}>La nueva categoría queda disponible solo para tu distribuidora.</p>}
          </div>
        )}
      </div>

      {/* Unidades y conversión */}
      <div className="border border-[#f0eded] rounded-[12px] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">Unidades y conversión</span>
          {agrupa && venta.value !== 'UN' && (
            <span className="bg-[#eff6ff] text-[#1d4ed8] font-['Inter'] font-semibold text-[11px] px-2 py-0.5 rounded-full">
              Venta fraccionada
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Unidad de compra</label>
            <Controller
              control={control}
              name="unidadCompra"
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    if (v === 'UN') setValue('factorConversion', 1, { shouldValidate: true });
                  }}
                  options={opcionesCompra}
                />
              )}
            />
          </div>
          <div>
            <label className={labelClass}>Factor</label>
            <input
              {...register('factorConversion')}
              type="number"
              min="1"
              disabled={!agrupa}
              className={`${inputClass} disabled:opacity-60 ${errors.factorConversion ? 'ring-2 ring-[#dc2626]/40' : ''}`}
            />
            {errors.factorConversion && <p className={errorClass}>{errors.factorConversion.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Unidad de venta</label>
            <Controller
              control={control}
              name="unidadVenta"
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={opcionesVenta}
                />
              )}
            />
          </div>
        </div>
        {agrupa && factor > 0 && (
          <div className="bg-[#f6f3f3] rounded-[8px] px-3 py-2 font-['Inter'] text-[13px] text-[#1b1b1c] flex items-center gap-2 flex-wrap">
            <strong>1 {compra.singular}</strong>
            <span className="text-[#9e2016]">→</span>
            <strong>{factor} {factor === 1 ? venta.label : venta.plural}</strong>
            <span className="text-[#a8a29e] text-[12px]">
              · 20 {compra.plural.toLowerCase()} = {(20 * factor).toLocaleString('es-CO')} {venta.plural.toLowerCase()}
            </span>
          </div>
        )}
        {margen != null && (
          <p className="font-['Inter'] text-[12px] text-[#57534e]">
            Margen:{' '}
            <strong className={margen >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}>
              {margen.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %
            </strong>
            {margenPorUnidad != null && (
              <span className="text-[#a8a29e]"> · {formatoCOP(margenPorUnidad)} por {venta.label.toLowerCase()}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
