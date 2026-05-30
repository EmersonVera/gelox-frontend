// src/components/comerciantes/NuevoComerciante.jsx
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../ui/CustomSelect';

const MUNICIPIOS = ['Ocaña', 'Cúcuta', 'Villa del Rosario', 'Los Patios', 'El Zulia', 'Tibú', 'Otro'];
const TALLAS = ['S', 'M', 'L', 'XL'];

export default function NuevoComerciante({ onClose, onSuccess }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    nombre: '',
    municipio: 'Ocaña',
    direccion: '',
    telefono: '',
    placa: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_parentesco: '',
    talla_uniforme: 'M',
  });
  const [foto, setFoto]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const inputFileRef = useRef();

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (file) { setFoto(file); setPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return; }

    setGuardando(true);
    try {
      // Siempre FormData para que el backend pueda recibir la foto como archivo
      const fd = new FormData();
      fd.append('nombre', form.nombre);
      if (form.municipio)                        fd.append('municipio',                    form.municipio);
      if (form.direccion)                        fd.append('direccion',                    form.direccion);
      if (form.telefono)                         fd.append('telefono',                     form.telefono);
      if (form.placa)                            fd.append('placa',                        form.placa);
      if (form.contacto_emergencia_nombre)       fd.append('contactoEmergenciaNombre',     form.contacto_emergencia_nombre);
      if (form.contacto_emergencia_parentesco)   fd.append('contactoEmergenciaParentesco', form.contacto_emergencia_parentesco);
      if (form.talla_uniforme)                   fd.append('tallaUniforme',                form.talla_uniforme);
      if (foto)                                  fd.append('foto',                         foto);
      // ⚠️ NO poner Content-Type — el interceptor de axios lo maneja automáticamente

      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${base}/api/comerciantes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Error al guardar el comerciante.');
      }
      onSuccess('¡Comerciante creado exitosamente!');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "bg-[#f6f3f3] border-none rounded-[10px] px-4 py-3.5 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full placeholder-[rgba(168,162,158,0.8)]";
  const labelClass = "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-2 block";

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/45 backdrop-blur-sm ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-[20px] w-full max-w-[760px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)] ${
          isClosing ? 'animate-scale-out' : 'animate-scale-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header rojo */}
        <div className="bg-[#9e2016] px-8 py-7 relative rounded-t-[20px]">
          <h2 className="font-['Manrope'] font-bold text-[28px] text-white leading-[34px]">
            Agregar Nuevo Comerciante
          </h2>
          <p className="font-['Inter'] font-normal text-[15px] text-white/80 mt-1">
            Complete el registro oficial de distribución para la red GELOX.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-6 right-6 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center cursor-pointer transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path d="M11 3L3 11M3 3l8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-8 py-7 grid grid-cols-2 gap-x-8 gap-y-5">

            {/* Columna izquierda */}
            <div className="flex flex-col gap-5">
              <div>
                <label className={labelClass}>Nombre Completo</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Luis Carlos"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Ubicación (Municipio)</label>
                <CustomSelect
                  value={form.municipio}
                  onChange={(val) => setForm(prev => ({ ...prev, municipio: val }))}
                  options={MUNICIPIOS}
                />
              </div>

              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  placeholder="Calle xx #xx-xx"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+57 ..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Placa del Carrito</label>
                <input
                  name="placa"
                  value={form.placa}
                  onChange={handleChange}
                  placeholder="Ej: ABC-123"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-5">
              <div>
                <label className={labelClass}>Contacto de Emergencia</label>
                <input
                  name="contacto_emergencia_nombre"
                  value={form.contacto_emergencia_nombre}
                  onChange={handleChange}
                  placeholder="Nombre completo"
                  className={inputClass}
                />
                <input
                  name="contacto_emergencia_parentesco"
                  value={form.contacto_emergencia_parentesco}
                  onChange={handleChange}
                  placeholder="Parentesco (Ej: Esposa)"
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div>
                <label className={labelClass}>Talla de Uniforme</label>
                <div className="flex gap-2">
                  {TALLAS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, talla_uniforme: t }))}
                      className={`flex-1 py-2.5 rounded-[8px] font-['Manrope'] font-semibold text-[15px] cursor-pointer transition-colors ${
                        form.talla_uniforme === t
                          ? 'bg-[#9e2016] text-white'
                          : 'bg-[#f6f3f3] text-[#1b1b1c] hover:bg-[#e7e5e4]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Fotografía del Perfil</label>
                <label className="border-2 border-dashed border-[#e7e5e4] rounded-[12px] p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#9e2016] transition-colors min-h-[100px]">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    ref={inputFileRef}
                    onChange={handleFoto}
                  />
                  {preview ? (
                    <img src={preview} alt="preview"
                      className="w-[72px] h-[72px] rounded-full object-cover" />
                  ) : (
                    <>
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="text-[#a8a29e]">
                        <rect x="2" y="6" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="12" cy="13.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M16 3v3M14 1h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] text-[#a8a29e]">
                        Subir Archivo
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-8 pb-2">
              <p className="font-['Inter'] text-[13px] text-[#dc2626]">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 pb-7 flex gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 bg-[#f6f3f3] hover:bg-[#e7e5e4] text-[#57534e] font-['Manrope'] font-semibold text-[16px] rounded-[10px] px-8 py-3.5 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-[2] bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[16px] rounded-[10px] px-8 py-3.5 cursor-pointer transition-colors"
            >
              {guardando ? 'Guardando...' : 'Guardar Comerciante'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
