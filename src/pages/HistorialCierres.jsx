// src/pages/HistorialCierres.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';

const ESTADOS = [
  { value: '',         label: 'Cualquier estado' },
  { value: 'perfecto', label: 'Cierre perfecto' },
  { value: 'mayor',   label: 'Físico mayor al sistema' },
  { value: 'menor',   label: 'Físico menor al sistema' },
];

const formatCOP = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2 });

function DiferenciaBadge({ valor }) {
  if (valor === 0) return (
    <span className="inline-flex items-center gap-1.5 bg-[#f5f5f4] text-[#78716c] rounded-full px-3 py-1 font-['Inter'] font-semibold text-[13px]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#78716c]" />{formatCOP(0)}
    </span>
  );
  if (valor < 0) return (
    <span className="inline-flex items-center gap-1.5 bg-[#fef2f2] text-[#dc2626] rounded-full px-3 py-1 font-['Inter'] font-semibold text-[13px]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />{formatCOP(valor)}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#f0fdf4] text-[#16a34a] rounded-full px-3 py-1 font-['Inter'] font-semibold text-[13px]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />+{formatCOP(valor)}
    </span>
  );
}

function PaginaBtn({ children, onClick, activo, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-[8px] font-['Inter'] font-medium text-[14px] flex items-center justify-center cursor-pointer transition-colors ${
        activo
          ? 'bg-[#9e2016] text-white'
          : disabled
          ? 'text-[#d6d3d1] cursor-not-allowed'
          : 'text-[#78716c] hover:bg-[#f6f3f3]'
      }`}
    >
      {children}
    </button>
  );
}

export default function HistorialCierres() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const hoy = new Date().toISOString().split('T')[0];
  const haceUnaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [desde, setDesde]                       = useState(haceUnaSemana);
  const [hasta, setHasta]                       = useState(hoy);
  const [estado, setEstado]                     = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState({ desde: haceUnaSemana, hasta: hoy, estado: '' });
  const [cierres, setCierres]                   = useState([]);
  const [total, setTotal]                       = useState(0);
  const [totalPages, setTotalPages]             = useState(1);
  const [page, setPage]                         = useState(1);
  const [cargando, setCargando]                 = useState(true);
  const [error, setError]                       = useState(null);

  const fetchCierres = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (filtrosAplicados.desde)  params.set('desde',  filtrosAplicados.desde);
      if (filtrosAplicados.hasta)  params.set('hasta',  filtrosAplicados.hasta);
      if (filtrosAplicados.estado) params.set('estado', filtrosAplicados.estado);
      const res = await fetch(`/api/cierre-caja?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setCierres(Array.isArray(data.cierres) ? data.cierres : []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      console.error(e);
      setError(e.message ?? 'No se pudo cargar el historial de cierres.');
      setCierres([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setCargando(false);
    }
  }, [token, page, filtrosAplicados]);

  useEffect(() => { fetchCierres(); }, [fetchCierres]);

  const handleAplicar = () => {
    setFiltrosAplicados({ desde, hasta, estado });
    setPage(1);
  };

  const inputClass =
    "bg-[#f6f3f3] border-none rounded-[8px] px-4 py-3 font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full";
  const labelClass =
    "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#1b1b1c] mb-2 block";

  return (
    <AppLayout>
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
          Historial de Cierre de Cajas
        </h1>
        <p className="font-['Inter'] font-normal text-[16px] text-[#78716c]">
          Consulta y auditoría de cierres diarios por canal de venta
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-6 flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <label className={labelClass}>Rango de Fechas</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className={inputClass}
            />
            <span className="text-[#a8a29e] text-[13px] shrink-0">→</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="w-[240px] min-w-[200px]">
          <label className={labelClass}>Estado (Diferencia)</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={inputClass}
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAplicar}
          className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] text-white font-['Manrope'] font-bold text-[14px] rounded-[8px] px-5 py-3 cursor-pointer transition-colors shrink-0"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Aplicar Filtros
        </button>
      </div>

      {/* Banner de error */}
      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[12px] px-5 py-4 flex items-start gap-3">
          <svg width="18" height="18" fill="none" viewBox="0 0 18 18" className="shrink-0 mt-0.5">
            <circle cx="9" cy="9" r="8" stroke="#dc2626" strokeWidth="1.4" />
            <path d="M9 5v5M9 13h.01" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <div>
            <p className="font-['Inter'] font-semibold text-[14px] text-[#dc2626]">
              No se pudieron cargar los cierres
            </p>
            <p className="font-['Inter'] font-normal text-[13px] text-[#ef4444] mt-0.5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden">

        {/* Encabezados */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr_40px] gap-4 px-6 py-3 border-b border-[#fafaf9]">
          {['Fecha', 'Monto Calculado', 'Monto Físico', 'Diferencia', ''].map((h) => (
            <span
              key={h}
              className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Filas */}
        {cargando ? (
          <div className="flex flex-col">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1.2fr_40px] gap-4 px-6 py-4 border-b border-[#fafaf9] animate-pulse"
              >
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 bg-[#f6f3f3] rounded" />
                ))}
              </div>
            ))}
          </div>
        ) : cierres.length === 0 ? (
          <div className="px-6 py-12 text-center font-['Inter'] text-[14px] text-[#a8a29e]">
            No hay cierres registrados para el período seleccionado.
          </div>
        ) : (
          cierres.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cierres-caja/${c.id}`)}
              className="grid grid-cols-[1fr_1fr_1fr_1.2fr_40px] gap-4 px-6 py-4 border-b border-[#fafaf9] hover:bg-[#fafaf9] cursor-pointer transition-colors items-center"
            >
              <span className="font-['Inter'] font-medium text-[15px] text-[#1b1b1c]">{c.fecha}</span>
              <span className="font-['Inter'] font-medium text-[15px] text-[#1b1b1c]">{formatCOP(c.montoCalculadoTotal)}</span>
              <span className="font-['Inter'] font-medium text-[15px] text-[#1b1b1c]">{formatCOP(c.montoFisicoTotal)}</span>
              <DiferenciaBadge valor={c.diferenciaTotal} />
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 16 16"
                className="text-[#a8a29e] justify-self-end"
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ))
        )}

        {/* Footer paginación */}
        <div className="flex items-center justify-between px-6 py-4">
          <p className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
            Mostrando {cierres.length} de {total} cierres registrados
          </p>
          <div className="flex gap-1 items-center">
            <PaginaBtn
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </PaginaBtn>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <PaginaBtn key={n} activo={n === page} onClick={() => setPage(n)}>
                {n}
              </PaginaBtn>
            ))}
            <PaginaBtn
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ›
            </PaginaBtn>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
