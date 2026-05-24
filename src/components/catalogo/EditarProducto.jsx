// src/components/catalogo/EditarProducto.jsx — RF20
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState, useRef } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '../../auth/firebase';
import { useAuth } from '../../context/AuthContext';
import ModalConfirmarEliminar from './ModalConfirmarEliminar';

const CATEGORIAS_OPT = ['Paletas', 'Conos', 'Familiares'];
const UNIDADES_OPT   = ['Unidades', 'Cajas', 'Litros'];

const CAT_LABEL = { PALETAS: 'Paletas', CONOS: 'Conos', FAMILIARES: 'Familiares' };

const schema = yup.object({
  nombre:        yup.string().required('Requerido'),
  codigoTecnico: yup.string().required('Requerido'),
  categoria:     yup.string().required('Requerido'),
  precioVenta:   yup.number().typeError('Número').positive().required('Requerido'),
  precioCosto:   yup.number().typeError('Número').min(0).required('Requerido'),
  descripcion:   yup.string().required('Requerido'),
  stockMedio:    yup.number().typeError('Número').min(0).required(),
  stockMinimo:   yup.number().typeError('Número').min(0).required(),
  unidadMedida:  yup.string().required(),
});

export default function EditarProducto({ producto, onClose, onSuccess }) {
  const { token } = useAuth();
  const [preview, setPreview]                     = useState(producto.imagenUrl || null);
  const [imagenNueva, setImagenNueva]             = useState(null);
  const [guardando, setGuardando]                 = useState(false);
  const [errorApi, setErrorApi]                   = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const inputFileRef = useRef();

  const categoriaDisplay = CAT_LABEL[producto.categoria] ?? producto.categoria ?? '';

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      nombre:        producto.nombre,
      codigoTecnico: producto.codigoTecnico,
      categoria:     categoriaDisplay,
      precioVenta:   producto.precioVenta,
      precioCosto:   producto.precioCosto ?? 0,
      descripcion:   producto.descripcion,
      stockMedio:    producto.stockMedio ?? 0,
      stockMinimo:   producto.stockMinimo ?? 0,
      unidadMedida:  producto.unidadMedida ?? 'Unidades',
    },
  });

  const handleImagen = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagenNueva(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const subirImagen = async (file) => {
    const storage    = getStorage(app);
    const nombre     = `catalogo/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, nombre);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const onSubmit = async (data) => {
    setGuardando(true);
    setErrorApi('');
    try {
      // Si el usuario seleccionó una imagen nueva, subirla a Firebase Storage
      let imagenUrl = producto.imagenUrl ?? null;
      if (imagenNueva) {
        imagenUrl = await subirImagen(imagenNueva);
      }

      const body = {
        codigoTecnico: data.codigoTecnico,
        nombre:        data.nombre,
        categoria:     data.categoria.toUpperCase(),
        precioVenta:   data.precioVenta,
        precioCosto:   data.precioCosto,
        descripcion:   data.descripcion,
        stockMinimo:   data.stockMinimo,
        imagenUrl,
      };

      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${base}/api/catalogo/productos/${producto.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorApi(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
  const labelClass = "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block";
  const errorClass = "font-['Inter'] text-[12px] text-[#dc2626] mt-1";

  if (confirmarEliminar) {
    return (
      <ModalConfirmarEliminar
        producto={producto}
        onClose={() => setConfirmarEliminar(false)}
        onSuccess={() => { onSuccess(); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#fef2f2] rounded-[10px] flex items-center justify-center shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <path d="M3 5h12M3 9h8M3 13h6" stroke="#9e2016" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 className="font-['Manrope'] font-bold text-[20px] text-[#1b1b1c]">Editar Producto</h2>
                <p className="font-['Inter'] font-normal text-[14px] text-[#a8a29e] mt-0.5">Gestión de inventario para GELOX</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setConfirmarEliminar(true)} className="text-[#78716c] hover:text-[#dc2626] cursor-pointer transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <path d="M2 5h14M6 5V3.5A1.5 1.5 0 0 1 7.5 2h3A1.5 1.5 0 0 1 12 3.5V5M4 5l1 10a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 13 15l1-10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button onClick={onClose} className="text-[#78716c] hover:text-[#1b1b1c] cursor-pointer">
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
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
                {producto.codigoTecnico} • {CAT_LABEL[producto.categoria] ?? producto.categoria}
              </p>
              <button
                type="button"
                onClick={() => inputFileRef.current?.click()}
                className="mt-2 bg-[#9e2016] text-white font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#c0392b] transition-colors"
              >
                Cambiar Imagen
              </button>
              <input ref={inputFileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImagen} />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* Nombre + Código */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre del Producto</label>
                <input {...register('nombre')} className={inputClass} />
                {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Código (SKU)</label>
                <input {...register('codigoTecnico')} className={inputClass} />
                {errors.codigoTecnico && <p className={errorClass}>{errors.codigoTecnico.message}</p>}
              </div>
            </div>

            {/* Categoría + Precio Venta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Categoría</label>
                <select {...register('categoria')} className={inputClass}>
                  {CATEGORIAS_OPT.map((c) => <option key={c}>{c}</option>)}
                </select>
                {errors.categoria && <p className={errorClass}>{errors.categoria.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Precio de Venta</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                  <input {...register('precioVenta')} type="number" step="0.01" className={`${inputClass} pl-8`} />
                </div>
                {errors.precioVenta && <p className={errorClass}>{errors.precioVenta.message}</p>}
              </div>
            </div>

            {/* Precio Costo */}
            <div>
              <label className={labelClass}>Precio de Costo COP</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                <input {...register('precioCosto')} type="number" step="0.01" className={`${inputClass} pl-8`} />
              </div>
              {errors.precioCosto && <p className={errorClass}>{errors.precioCosto.message}</p>}
            </div>

            {/* Descripción */}
            <div>
              <label className={labelClass}>Descripción Breve</label>
              <textarea {...register('descripcion')} className={`${inputClass} h-[96px] resize-none`} />
              {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
            </div>

            {/* Stock */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Stock Medio</label>
                <input {...register('stockMedio')} type="number" min="0" className={inputClass} />
                {errors.stockMedio && <p className={errorClass}>{errors.stockMedio.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Stock Mínimo (Alerta)</label>
                <input {...register('stockMinimo')} type="number" min="0" className={inputClass} />
                {errors.stockMinimo && <p className={errorClass}>{errors.stockMinimo.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Unidad de Medida</label>
                <select {...register('unidadMedida')} className={inputClass}>
                  {UNIDADES_OPT.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {errorApi && <p className={errorClass}>{errorApi}</p>}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setConfirmarEliminar(true)}
                className="flex items-center gap-2 font-['Inter'] font-semibold text-[14px] text-[#dc2626] hover:text-[#b91c1c] cursor-pointer transition-colors"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                  <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Eliminar Producto
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-[#e7e5e4] rounded-[8px] px-5 py-2.5 font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:bg-[#f6f3f3] cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] px-6 py-2.5 rounded-[8px] cursor-pointer transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Actualizar Cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
