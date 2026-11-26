// src/components/catalogo/EditarProducto.jsx — RF20
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import ModalConfirmarEliminar from './ModalConfirmarEliminar';
import ContenidoCarga from '../ui/ContenidoCarga';
import CamposMultimarca from './CamposMultimarca';
import {
  esquemaMultimarca, valoresMultimarca, agregarMultimarca, cargarCodigoProveedor, guardarCodigoProveedor,
} from './multimarcaForm';
import { esCuotaAlcanzada, mensajeErrorApi, textoError } from '../../utils/errores';
import ModalCuotaAlcanzada from '../ui/ModalCuotaAlcanzada';
import { infoCompra, infoVenta } from './unidadesUtils';

const CAT_LABEL      = { PALETAS: 'Paletas', CONOS: 'Conos', FAMILIARES: 'Familiares', VASOS: 'Vasos' };

const schema = yup.object({
  nombre:        yup.string().required('Requerido'),
  ...esquemaMultimarca,
  precioVenta:   yup.number().typeError('Número').positive('Debe ser mayor a 0').required('Requerido'),
  precioCosto:   yup.number().typeError('Número').positive('Debe ser mayor a 0').required('Requerido'),
  descripcion:   yup.string().required('Requerido'),
  stockMedio:    yup.number().typeError('Número').min(0).required(),
  stockMinimo:   yup.number().typeError('Número').min(0).required(),
});

export default function EditarProducto({ producto, onClose, onSuccess }) {
  const { perfil } = useAuth();
  const puedeVerCosto = ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'].includes(perfil?.rol);
  const [preview, setPreview]                     = useState(producto.imagenUrl || null);
  const [imagenNueva, setImagenNueva]             = useState(null);
  const [guardando, setGuardando]                 = useState(false);
  const [errorApi, setErrorApi]                   = useState('');
  const [cuotaAgotada, setCuotaAgotada]           = useState(null); // { error, nombre } — 409 de cuota
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [isClosing, setIsClosing]                 = useState(false);
  const inputFileRef = useRef();

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => { setIsClosing(false); onClose(); }, 200);
  };

  const { register, handleSubmit, control, watch, setValue, setError, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      nombre:        producto.nombre,
      ...valoresMultimarca(producto),
      precioVenta:   producto.precioVenta,
      precioCosto:   producto.precioCosto ?? 0,
      descripcion:   producto.descripcion,
      stockMedio:    producto.stockMedio ?? 0,
      stockMinimo:   producto.stockMinimo ?? 0,
      precioComerciente: producto.precioComerciente ?? '',
    },
  });

  const compra = infoCompra(watch('unidadCompra'));
  const venta  = infoVenta(watch('unidadVenta'));

  // Código del proveedor: vive en las homologaciones del proveedor, no en el producto.
  const codigoInicial = useRef('');
  useEffect(() => {
    let vivo = true;
    cargarCodigoProveedor(producto.proveedorId, producto.id)
      .then((codigo) => {
        if (!vivo) return;
        codigoInicial.current = codigo;
        setValue('codigoProveedor', codigo);
      })
      .catch(() => { /* sin plantilla o sin permiso: el campo queda vacío */ });
    return () => { vivo = false; };
  }, [producto.proveedorId, producto.id, setValue]);

  const handleImagen = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenNueva(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setGuardando(true);
    setErrorApi('');
    setCuotaAgotada(null);
    try {
      const fd = new FormData();
      fd.append('nombre',        data.nombre);
      agregarMultimarca(fd, data);
      fd.append('precioVenta',   data.precioVenta);
      fd.append('precioCosto', data.precioCosto ?? 0);
      if (data.descripcion)         fd.append('descripcion', data.descripcion);
      if (data.stockMinimo != null) fd.append('stockMinimo', data.stockMinimo);
      if (data.stockMedio  != null) fd.append('stockMedio',  data.stockMedio);
      if (data.precioComerciente  != null && data.precioComerciente !== '') fd.append('precioComerciente', data.precioComerciente);
      if (imagenNueva) fd.append('imagen', imagenNueva); // ← campo "imagen", no "foto"

      const res = await api.put(`/api/catalogo/productos/${producto.id}`, fd);
      if (res.status < 200 || res.status >= 300) {
        throw new Error(res.data?.message || `Error ${res.status}`);
      }
      // Código del proveedor = homologación (RF67); solo se envía si cambió.
      let aviso = '';
      const codigo = (data.codigoProveedor ?? '').trim();
      const cambioCodigo = codigo !== codigoInicial.current || data.proveedorId !== producto.proveedorId;
      if (cambioCodigo && (codigo || codigoInicial.current)) {
        try {
          await guardarCodigoProveedor(data.proveedorId, producto.id, codigo);
        } catch (e) {
          aviso = ` No se guardó el código del proveedor: ${mensajeErrorApi(e, 'intenta de nuevo.')}`;
        }
      }
      onSuccess(`Producto actualizado correctamente.${aviso}`);
      handleClose();
    } catch (err) {
      if (esCuotaAlcanzada(err)) {
        // RF70 — al editar solo puede llegar la de almacenamiento (imagen nueva)
        setCuotaAgotada({ error: err, nombre: data.nombre });
      } else if (err?.response?.status === 409) {
        // 409 por SKU o código repetido («El SKU ya está en uso por otro producto»)
        const msg = textoError(err) || 'Ya existe un producto con este SKU en tu distribuidora.';
        if (/sku|c[oó]digo/i.test(msg)) setError('sku', { message: msg });
        setErrorApi(msg);
      } else {
        setErrorApi(mensajeErrorApi(err, err?.message || 'No se pudo actualizar el producto. Intenta de nuevo.', 'productos'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const inputClass  = "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
  const labelClass  = "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block";
  const errorClass  = "font-['Inter'] text-[12px] text-[#dc2626] mt-1";

  /* ── Modal confirmar eliminar ── */
  if (confirmarEliminar) {
    return createPortal(
      <ModalConfirmarEliminar
        producto={producto}
        onClose={() => setConfirmarEliminar(false)}
        onSuccess={() => { onSuccess(); onClose(); }}
      />,
      document.body
    );
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-[600px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col max-h-[calc(100vh-2rem)] ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 flex flex-col gap-6 overflow-y-auto">

          {/* Header — solo título y cierre, sin botón eliminar */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#fef2f2] rounded-[10px] flex items-center justify-center shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <path d="M3 5h12M3 9h8M3 13h6" stroke="#9e2016" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="font-['Manrope'] font-bold text-[20px] text-[#1b1b1c]">Editar Producto</h2>
                <p className="font-['Inter'] font-normal text-[14px] text-[#a8a29e] mt-0.5">
                  Gestión de inventario para GELOX
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-[#78716c] hover:text-[#1b1b1c] cursor-pointer">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Preview producto */}
          <div className="bg-[#f6f3f3] rounded-[12px] p-4 flex gap-4 items-center">
            {preview ? (
              <img src={preview} alt={producto.nombre} className="w-[80px] h-[80px] rounded-[8px] object-cover shrink-0" />
            ) : (
              <div className="w-[80px] h-[80px] rounded-[8px] bg-[#e7e5e4] flex items-center justify-center shrink-0">
                <span className="text-[#a8a29e] text-[10px]">Sin imagen</span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-['Manrope'] font-semibold text-[18px] text-[#9e2016]">{producto.nombre}</p>
              <p className="font-['Inter'] font-normal text-[13px] text-[#a8a29e] mt-0.5">
                {producto.sku ?? producto.codigoTecnico} • {CAT_LABEL[producto.categoria] ?? producto.categoria}
                {producto.marca ? ` • ${producto.marca}` : ''}
              </p>
              <button
                type="button"
                onClick={() => inputFileRef.current?.click()}
                className="mt-2 bg-[#9e2016] text-white font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#c0392b] transition-colors"
              >
                Cambiar Imagen
              </button>
              <input
                ref={inputFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImagen}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* Nombre */}
            <div>
              <label className={labelClass}>Nombre del Producto *</label>
              <input {...register('nombre')} className={inputClass} />
              {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
            </div>

            {/* SKU, proveedor, marca, categoría y unidad con factor */}
            <CamposMultimarca register={register} control={control} errors={errors} watch={watch} setValue={setValue} />

            {/* Precio Venta */}
            <div>
              <label className={labelClass}>Precio de venta por {venta.label.toLowerCase()} COP *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                <input {...register('precioVenta')} type="number" step="0.01" className={`${inputClass} pl-8`} />
              </div>
              {errors.precioVenta && <p className={errorClass}>{errors.precioVenta.message}</p>}
            </div>

            {/* Precio Costo + Precio Comerciante — ADMINISTRADOR y ENCARGADO_INVENTARIO */}
            {puedeVerCosto && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Costo por {compra.singular.toLowerCase()} COP *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                    <input {...register('precioCosto')} type="number" step="0.01" className={`${inputClass} pl-8`} />
                  </div>
                  {errors.precioCosto && <p className={errorClass}>{errors.precioCosto.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Precio Comerciante COP</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                    <input {...register('precioComerciente')} type="number" step="0.01" className={`${inputClass} pl-8`} />
                  </div>
                  {errors.precioComerciente && <p className={errorClass}>{errors.precioComerciente.message}</p>}
                </div>
              </div>
            )}

            {/* Descripción */}
            <div>
              <label className={labelClass}>Descripción Breve</label>
              <textarea {...register('descripcion')} className={`${inputClass} h-[96px] resize-none`} />
              {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
            </div>

            {/* Configuración alertas — mismo estilo que NuevoProducto */}
            <div className="bg-[#fef2f2] rounded-[12px] p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <path d="M7 1a4 4 0 0 1 4 4c0 3 1 4 1 4H2s1-1 1-4a4 4 0 0 1 4-4zM5.5 9a1.5 1.5 0 0 0 3 0" stroke="#9e2016" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016]">
                  Configuración de Alertas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Stock Medio ({venta.plural.toLowerCase()})</label>
                  <input {...register('stockMedio')} type="number" min="0" className={inputClass} />
                  {errors.stockMedio && <p className={errorClass}>{errors.stockMedio.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Stock Mínimo ({venta.plural.toLowerCase()})</label>
                  <input {...register('stockMinimo')} type="number" min="0" className={inputClass} />
                  {errors.stockMinimo && <p className={errorClass}>{errors.stockMinimo.message}</p>}
                </div>
              </div>
            </div>

            {cuotaAgotada && (
              <ModalCuotaAlcanzada
                error={cuotaAgotada.error}
                recurso="productos"
                nombre={cuotaAgotada.nombre}
                onClose={() => setCuotaAgotada(null)}
              />
            )}
            {errorApi && (
              <div className="px-4 py-3 rounded-xl bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] text-sm flex items-start gap-2">
                <svg width="15" height="15" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{errorApi}</span>
              </div>
            )}

            {/* Footer — sin botón Eliminar */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:text-[#1b1b1c] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] px-6 py-3 rounded-[8px] cursor-pointer transition-colors"
              >
                <ContenidoCarga cargando={guardando} textoCargando="Guardando...">Actualizar Cambios</ContenidoCarga>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
