// src/pages/inventarios/RegistroMerma.jsx — RF25: Registro de Merma / Degustación
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/ui/CustomSelect';
import SuccessToast from '../../components/SuccessToast';

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
  const [guardando, setGuardando]           = useState(false);
  const [error, setError]                   = useState('');
  const [toast, setToast]                   = useState({ show: false, msg: '', type: 'success' });
  const [errorProductos, setErrorProductos] = useState('');
  const [cargandoProd, setCargandoProd]     = useState(true);

  useEffect(() => {
    setCargandoProd(true);
    setErrorProductos('');
    fetch(`${base}/api/catalogo/productos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        if (!r.ok) {
          if (r.status === 401) throw Object.assign(new Error(), { status: 401 });
          if (r.status === 403) throw Object.assign(new Error(), { status: 403 });
          if (r.status >= 500)  throw Object.assign(new Error(), { status: 500 });
          throw Object.assign(new Error(), { status: r.status });
        }
        return r.json();
      })
      .then(d => {
        const list = d.productos ?? d.content ?? d;
        setProductos(Array.isArray(list) ? list : []);
      })
      .catch(e => {
        setProductos([]);
        const status = e?.status;
        if (!status || e instanceof TypeError)
          setErrorProductos('Sin conexión a internet. No se pudo cargar el catálogo de productos.');
        else if (status === 401)
          setErrorProductos('Tu sesión ha expirado. Vuelve a iniciar sesión.');
        else if (status === 403)
          setErrorProductos('No tienes permisos para ver el catálogo de productos.');
        else if (status >= 500)
          setErrorProductos('Error en el servidor al cargar el catálogo. Intenta más tarde.');
        else
          setErrorProductos('No se pudo cargar el catálogo de productos. Intenta de nuevo.');
      })
      .finally(() => setCargandoProd(false));
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
      // RF25 — RegistrarPerdidaRequest: productoId, cantidad, motivo, fecha, observaciones
      const res = await fetch(`${base}/api/inventario/perdidas`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          productoId:    form.producto_id,
          cantidad:      Number(form.cantidad),
          motivo:        form.motivo,
          fecha:         form.fecha,
          observaciones: form.observaciones,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.mensaje ?? errData.message ?? errData.error ?? '';
        if (res.status === 400) throw new Error(msg || 'Datos inválidos. Revisa los campos e intenta de nuevo.');
        if (res.status === 404) throw new Error('El producto seleccionado no existe o fue eliminado.');
        if (res.status >= 500)  throw new Error('Error en el servidor al guardar el registro. Intenta más tarde.');
        throw new Error(msg || 'No se pudo guardar el registro de merma.');
      }
      setToast({ show: true, msg: 'Registro guardado correctamente.', type: 'success' });
      setForm({
        producto_id:   '',
        cantidad:      0,
        unidad_medida: 'Unidades',
        motivo:        'Merma',
        fecha:         new Date().toISOString().split('T')[0],
        observaciones: '',
      });
    } catch (err) {
      setToast({ show: true, msg: err.message, type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const inputClass  =
    "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
  const labelClass  =
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

        {/* Banner error catálogo */}
        {errorProductos && (
          <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] px-4 py-3 flex items-start gap-2">
            <svg width="15" height="15" className="shrink-0 mt-0.5 text-[#dc2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="font-['Inter'] font-medium text-[14px] text-[#dc2626]">{errorProductos}</span>
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
              <CustomSelect
                value={form.producto_id}
                onChange={v => setForm(prev => ({ ...prev, producto_id: v }))}
                options={[
                  { value: '', label: 'Seleccione un producto del catálogo...' },
                  ...productos.map(p => ({
                    value: String(p.id),
                    label: `${p.nombre}${p.codigoTecnico || p.codigo_tecnico ? ` — ${p.codigoTecnico ?? p.codigo_tecnico}` : ''}`,
                  })),
                ]}
                placeholder="Seleccione un producto del catálogo..."
                searchable
              />
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
                  <CustomSelect
                    value={form.unidad_medida}
                    onChange={v => setForm(prev => ({ ...prev, unidad_medida: v }))}
                    options={UNIDADES}
                    className="w-[120px] shrink-0"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Motivo del Ajuste</label>
                <CustomSelect
                  value={form.motivo}
                  onChange={v => setForm(prev => ({ ...prev, motivo: v }))}
                  options={MOTIVOS}
                />
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

            {/* Error submit */}
            {error && (
              <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] px-4 py-3 flex items-start gap-2">
                <svg width="15" height="15" className="shrink-0 mt-0.5 text-[#dc2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="font-['Inter'] font-medium text-[14px] text-[#dc2626]">{error}</span>
              </div>
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
                className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] px-6 py-3 rounded-[8px] cursor-pointer transition-colors"
              >
                {guardando ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />Guardando...</>
                ) : 'Guardar Registro'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SuccessToast
        message={toast.msg}
        show={toast.show}
        onClose={() => setToast(t => ({ ...t, show: false }))}
        type={toast.type}
      />
    </AppLayout>
  );
}
