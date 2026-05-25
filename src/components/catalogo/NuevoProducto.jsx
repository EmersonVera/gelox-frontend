// src/components/catalogo/NuevoProducto.jsx — RF19
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '../../auth/firebase';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../ui/CustomSelect';

const CATEGORIAS_OPT = ['Paletas', 'Conos', 'Familiares'];
const UNIDADES_OPT   = ['Unidades', 'Cajas', 'Litros'];

const schema = yup.object({
  nombre:        yup.string().required('El nombre es requerido'),
  codigoTecnico: yup.string().required('El código es requerido'),
  categoria:     yup.string().required('Selecciona una categoría'),
  precioVenta:   yup.number().typeError('Ingresa un número').positive('Debe ser mayor a 0').required('El precio es requerido'),
  precioCosto:   yup.number().typeError('Ingresa un número').min(0, 'Debe ser >= 0').optional(),
  descripcion:   yup.string().required('La descripción es requerida'),
  stockMedio:    yup.number().typeError('Ingresa un número').min(0).required('Requerido'),
  stockMinimo:   yup.number().typeError('Ingresa un número').min(0).required('Requerido'),
  unidadMedida:  yup.string().required('Requerido'),
});

export default function NuevoProducto({ onClose, onSuccess }) {
  const { token, perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';
  const [imagen, setImagen]       = useState(null);
  const [preview, setPreview]     = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorApi, setErrorApi]   = useState('');

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { stockMedio: 0, stockMinimo: 0, unidadMedida: 'Unidades', categoria: '' },
  });

  const handleImagen = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagen(file);
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
      let imagenUrl = null;
      if (imagen) imagenUrl = await subirImagen(imagen);

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
      const res = await fetch(`${base}/api/catalogo/productos`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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

  const inputClass  = "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
  const labelClass  = "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block";
  const errorClass  = "font-['Inter'] text-[12px] text-[#dc2626] mt-1";

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-[16px] w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-['Manrope'] font-bold text-[20px] text-[#1b1b1c]">
                Registrar Nuevo Producto
              </h2>
              <p className="font-['Inter'] font-normal text-[14px] text-[#a8a29e] mt-1">
                Ingresa los detalles técnicos y comerciales del helado
              </p>
            </div>
            <button onClick={onClose} className="text-[#78716c] hover:text-[#1b1b1c] cursor-pointer mt-1">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* Nombre + Código */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre del Producto</label>
                <input {...register('nombre')} placeholder="Ej. Paleta de Fresa" className={inputClass} />
                {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Código de Referencia</label>
                <input {...register('codigoTecnico')} placeholder="GEL-001" className={inputClass} />
                {errors.codigoTecnico && <p className={errorClass}>{errors.codigoTecnico.message}</p>}
              </div>
            </div>

            {/* Categoría + Precio Venta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Categoría</label>
                <Controller
                  control={control}
                  name="categoria"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: 'Seleccionar...' },
                        ...CATEGORIAS_OPT.map(c => ({ value: c, label: c })),
                      ]}
                    />
                  )}
                />
                {errors.categoria && <p className={errorClass}>{errors.categoria.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Precio de Venta COP</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                  <input {...register('precioVenta')} type="number" step="0.01" placeholder="0.00" className={`${inputClass} pl-8`} />
                </div>
                {errors.precioVenta && <p className={errorClass}>{errors.precioVenta.message}</p>}
              </div>
            </div>

            {/* Precio Costo — solo ADMINISTRADOR */}
            {esAdmin && (
              <div>
                <label className={labelClass}>Precio de Costo COP</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-['Inter'] text-[16px] text-[#a8a29e]">$</span>
                  <input {...register('precioCosto')} type="number" step="0.01" placeholder="0.00" className={`${inputClass} pl-8`} />
                </div>
                {errors.precioCosto && <p className={errorClass}>{errors.precioCosto.message}</p>}
              </div>
            )}

            {/* Descripción */}
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                {...register('descripcion')}
                placeholder="Detalles sobre ingredientes, sabor y presentación..."
                className={`${inputClass} h-[96px] resize-none`}
              />
              {errors.descripcion && <p className={errorClass}>{errors.descripcion.message}</p>}
            </div>

            {/* Configuración alertas */}
            <div className="bg-[#fef2f2] rounded-[12px] p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <path d="M7 1a4 4 0 0 1 4 4c0 3 1 4 1 4H2s1-1 1-4a4 4 0 0 1 4-4zM5.5 9a1.5 1.5 0 0 0 3 0" stroke="#9e2016" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016]">
                  Configuración de Alertas
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Stock Medio</label>
                  <input {...register('stockMedio')} type="number" min="0" className={inputClass} />
                  {errors.stockMedio && <p className={errorClass}>{errors.stockMedio.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Stock Mínimo</label>
                  <input {...register('stockMinimo')} type="number" min="0" className={inputClass} />
                  {errors.stockMinimo && <p className={errorClass}>{errors.stockMinimo.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>Unidad de Medida</label>
                  <Controller
                    control={control}
                    name="unidadMedida"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={UNIDADES_OPT}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Foto */}
            <div>
              <label className={labelClass}>Foto del Producto</label>
              <label className="border-2 border-dashed border-[#e7e5e4] rounded-[12px] p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[#9e2016] transition-colors">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImagen} />
                {preview ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <img src={preview} alt="preview" className="w-full h-[140px] object-cover rounded-[8px]" />
                    <span className="font-['Inter'] text-[12px] text-[#9e2016]">Clic para cambiar imagen</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center">
                      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
                        <path d="M3 17l4-4 3 3 4-5 5 6H3z" stroke="#9e2016" strokeWidth="1.4" strokeLinejoin="round" />
                        <circle cx="7.5" cy="8.5" r="1.5" stroke="#9e2016" strokeWidth="1.4" />
                        <rect x="1" y="3" width="20" height="16" rx="2" stroke="#9e2016" strokeWidth="1.4" />
                        <path d="M15 1v4M13 3h4" stroke="#9e2016" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-['Manrope'] font-semibold text-[14px] text-[#1b1b1c]">
                        Haz clic para subir o arrastra la imagen
                      </p>
                      <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e] mt-1">
                        PNG, JPG, WEBP hasta 5MB
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>

            {errorApi && <p className={errorClass}>{errorApi}</p>}

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:text-[#1b1b1c] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] px-6 py-3 rounded-[8px] cursor-pointer transition-colors"
              >
                {guardando ? 'Guardando...' : '💾 Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
