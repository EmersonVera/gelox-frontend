// src/pages/inventarios/ReportePedido.jsx — RF22 (Vista 1): Lista de pedidos
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';

const base = import.meta.env.VITE_API_BASE_URL ?? '';

const BADGE = {
  COMPLETO:     'bg-[#f0fdf4] text-[#16a34a]',
  DISCREPANCIA: 'bg-[#fef2f2] text-[#dc2626]',
  PENDIENTE:    'bg-[#fefce8] text-[#ca8a04]',
};

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

export default function ReportePedido() {
  const { token }   = useAuth();
  const navigate    = useNavigate();
  const [pedidos, setPedidos]       = useState([]);
  const [kpis, setKpis]             = useState({ totalUnidades: 0, discrepancias: 0 });
  const [busqueda, setBusqueda]     = useState('');
  const [estado, setEstado]         = useState('');
  const [fecha, setFecha]           = useState('30d');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cargando, setCargando]     = useState(true);

  const fetchPedidos = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (busqueda) params.set('q', busqueda);
      if (estado)   params.set('estado', estado);
      if (fecha)    params.set('periodo', fecha);
      const res  = await fetch(`${base}/api/inventario/pedidos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`pedidos ${res.status}`);
      const data = await res.json();
      const list = data.pedidos ?? data.content ?? data;
      setPedidos(Array.isArray(list) ? list : []);
      setTotal(data.total ?? data.totalElements ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (data.kpis) setKpis(data.kpis);
    } catch (e) {
      console.error('fetchPedidos:', e);
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, [token, page, busqueda, estado, fecha]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const selectClass =
    "bg-[#f6f3f3] border-none rounded-[8px] px-3 py-2.5 font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">

        {/* Header */}
        <div>
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016] mb-1">
            ▣ Módulo de Inventarios
          </p>
          <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
            Reporte Pedidos
          </h1>
          <p className="font-['Inter'] font-normal text-[16px] text-[#78716c]">
            Historial de pedidos, seleccione el pedido a gestionar
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex items-center justify-between">
            <div>
              <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-1">
                Total Procesado (Mes)
              </p>
              <p className="font-['Manrope'] font-bold text-[24px] text-[#1b1b1c]">
                {kpis.totalUnidades.toLocaleString()}{' '}
                <span className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">unid</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-[#f6f3f3] rounded-[10px] flex items-center justify-center text-[20px]">
              📋
            </div>
          </div>
          <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex items-center justify-between">
            <div>
              <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-1">
                Discrepancias Detectadas
              </p>
              <p className="font-['Manrope'] font-bold text-[24px] text-[#dc2626]">
                {kpis.discrepancias}{' '}
                <span className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">casos</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-[#fef2f2] rounded-[10px] flex items-center justify-center text-[20px]">
              ⚠️
            </div>
          </div>
        </div>

        {/* Búsqueda + filtros */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]"
              width="16" height="16" fill="none" viewBox="0 0 16 16"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPage(1); }}
              placeholder="Buscar registro o ID de pedido..."
              className="bg-[#f6f3f3] border-none rounded-[8px] pl-10 pr-4 py-2.5 w-full font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-['Inter'] font-medium text-[14px] text-[#57534e]">Estado:</span>
            <select
              value={estado}
              onChange={e => { setEstado(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="COMPLETO">Completo</option>
              <option value="DISCREPANCIA">Discrepancia</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-['Inter'] font-medium text-[14px] text-[#57534e]">Fecha:</span>
            <select
              value={fecha}
              onChange={e => { setFecha(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="30d">Últimos 30 días</option>
              <option value="7d">Últimos 7 días</option>
              <option value="mes">Este mes</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden">
          {/* Encabezados */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-[#fafaf9] border-b border-[#f5f5f4]">
            {['Registro / Pedido ID', 'Fecha', 'Total Pedido', 'Total Recibido', 'Estado'].map(h => (
              <span
                key={h}
                className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Filas skeleton */}
          {cargando ? (
            [1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 border-b border-[#fafaf9] animate-pulse"
              >
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="h-4 bg-[#f6f3f3] rounded" />
                ))}
              </div>
            ))
          ) : pedidos.length === 0 ? (
            <div className="px-6 py-12 text-center font-['Inter'] text-[14px] text-[#a8a29e]">
              No hay pedidos registrados.
            </div>
          ) : (
            pedidos.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/inventarios/pedidos/${p.id}`)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 border-b border-[#fafaf9] hover:bg-[#fafaf9] cursor-pointer transition-colors items-center"
              >
                {/* Nombre + ID */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#fef2f2] rounded-[6px] flex items-center justify-center text-[#9e2016] text-[12px]">
                    ≡
                  </div>
                  <div>
                    <p className="font-['Manrope'] font-semibold text-[14px] text-[#1b1b1c]">
                      {p.nombre ?? `Pedido ${p.id_pedido}`}
                    </p>
                    <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">
                      {p.id_pedido ?? p.id}
                    </p>
                  </div>
                </div>
                {/* Fecha */}
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {p.fecha}
                </span>
                {/* Total pedido */}
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {p.total_pedido?.toLocaleString() ?? '—'}
                </span>
                {/* Total recibido */}
                <span
                  className={`font-['Inter'] font-medium text-[14px] ${
                    p.estado === 'DISCREPANCIA' ? 'text-[#dc2626]' : 'text-[#1b1b1c]'
                  }`}
                >
                  {p.total_recibido?.toLocaleString() ?? '—'}
                </span>
                {/* Badge estado */}
                <span
                  className={`inline-flex items-center font-['Inter'] font-bold text-[12px] uppercase px-3 py-1 rounded-full ${
                    BADGE[p.estado] ?? BADGE.PENDIENTE
                  }`}
                >
                  {p.estado}
                </span>
              </div>
            ))
          )}

          {/* Footer paginación */}
          <div className="flex items-center justify-between px-6 py-4">
            <p className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
              Mostrando {pedidos.length} de {total} registros
            </p>
            <div className="flex gap-1 items-center">
              <PaginaBtn
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹
              </PaginaBtn>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                <PaginaBtn
                  key={n}
                  activo={n === page}
                  onClick={() => setPage(n)}
                >
                  {n}
                </PaginaBtn>
              ))}
              <PaginaBtn
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
