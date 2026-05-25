// src/pages/inventarios/RegistroMerma.jsx — RF25: Registro de Merma / Degustación
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';

const MOTIVOS  = ['Merma', 'Degustación', 'Daño', 'Vencimiento', 'Otro'];
const UNIDADES = ['Unidades', 'Cajas'];
const base     = import.meta.env.VITE_API_BASE_URL ?? '';

export default function RegistroMerma() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    producto_id:  '',
    cantidad:     0,
    unidad_medida: 'Unidades',
    motivo:       'Merma',
    fecha:        new Date().toISOString().split('T')[0],
    observaciones: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const [exito, setExito]         = useState(false);

  useEffect(() => {
    fetch(`${base}/api/catalogo/productos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) { console.warn('catalogo productos:', r.status); return { content: [] }; }
        return r.json();
      })
      .then(d => {
        const list = d.productos ?? d.content ?? d;
        setProductos(Array.isArray(list) ? list : []);
      })
      .catch(console.error);
  }, [token]);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto_id) { setError('Selecciona un producto.'); return; }
    if (Number(form.cantidad) <= 0) { setError('La cantidad debe ser mayor a 0.'); return; }
    setError('');
    setGuardando(true);
    try {
      const res = await fetch(`${base}/api/inventario/perdidas`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, cantidad: Number(form.cantidad) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Error al guardar el registro.');
      }
      setExito(true);
      setForm({
        producto_id:   '',
        cantidad:      0,
        unidad_medida: 'Unidades',
        motivo:        'Merma',
        fecha:         new Date().toISOString().split('T')[0],
        observaciones: '',
      });
      setTimeout(() => setExito(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const inputClass =
    "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
  const labelClass =
    "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div>
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016] mb-1">
            ▣ Módulo de Inventarios
          </p>
          <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
            Registro de Merma / Degustación
          </h1>
          <p className="font-['Inter'] font-normal text-[16px] text-[#78716c]">
            Documente con precisión la salida de productos que no corresponden a ventas directas
            para mantener la integridad de sus existencias físicas.
          </p>
        </div>

        {/* Banner éxito */}
        {exito && (
          <div className="bg-[#f0fdf4] border border-[#16a34a]/20 rounded-[10px] px-4 py-3 flex items-center gap-2">
            <span className="text-[#16a34a]">✓</span>
            <span className="font-['Inter'] font-medium text-[14px] text-[#16a34a]">
              Registro guardado correctamente.
            </span>
          </div>
        )}

        {/* Card formulario */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-6">
          <h2 className="font-['Manrope'] font-semibold text-[18px] text-[#1b1b1c] flex items-center gap-2 mb-6">
            <span className="text-[#9e2016]">⊕</span> Nuevo Registro
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Producto */}
            <div>
              <label className={labelClass}>Producto o Referencia</label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]"
                  width="16" height="16" fill="none" viewBox="0 0 16 16"
                >
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <select
                  name="producto_id"
                  value={form.producto_id}
                  onChange={handleChange}
                  className={`${inputClass} pl-10`}
                >
                  <option value="">Seleccione un producto del catálogo...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.codigoTecnico || p.codigo_tecnico ? ` — ${p.codigoTecnico ?? p.codigo_tecnico}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cantidad + Motivo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Cantidad</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="cantidad"
                    value={form.cantidad}
                    onChange={handleChange}
                    min="0"
                    className={inputClass}
                  />
                  <select
                    name="unidad_medida"
                    value={form.unidad_medida}
                    onChange={handleChange}
                    className="bg-[#f6f3f3] border-none rounded-[8px] px-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none w-[120px] shrink-0"
                  >
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Motivo del Ajuste</label>
                <select
                  name="motivo"
                  value={form.motivo}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Fecha + Observaciones */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Fecha del Evento</label>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Responsable / Observaciones</label>
                <input
                  type="text"
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  placeholder="Ej: Control de calidad"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Nota importante */}
            <div className="bg-[#fef2f2] rounded-[10px] p-4 border-l-4 border-[#9e2016] flex gap-3">
              <span className="text-[#9e2016] shrink-0 mt-0.5">ⓘ</span>
              <p className="font-['Inter'] font-normal text-[13px] text-[#57534e] leading-[20px]">
                <strong className="font-semibold text-[#1b1b1c]">Nota Importante:</strong>{' '}
                Estos registros se utilizan estrictamente para el control logístico de stock.
                Esta operación no afecta la utilidad neta financiera del reporte mensual.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="font-['Inter'] text-[13px] text-[#dc2626]">{error}</p>
            )}

            {/* Footer acciones */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:text-[#1b1b1c] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] px-6 py-3 rounded-[8px] cursor-pointer transition-colors"
              >
                {guardando ? 'Guardando...' : 'Guardar Registro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
