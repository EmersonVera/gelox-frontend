// src/pages/inventarios/ReportePedido.jsx — RF22 (Vista 1): Lista de pedidos
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/ui/CustomSelect';

const base = import.meta.env.VITE_API_BASE_URL ?? '';

// Estados reales del backend: PENDIENTE, RECIBIDO, CANCELADO
const BADGE = {
  PENDIENTE: 'bg-[#fefce8] text-[#ca8a04]',
  RECIBIDO:  'bg-[#f0fdf4] text-[#16a34a]',
  CANCELADO: 'bg-[#fef2f2] text-[#dc2626]',
};

// Pseudo-estados para filtro avanzado dentro de RECIBIDO
const PSEUDO_ESTADOS = new Set(['RECIBIDO_FALTANTE', 'RECIBIDO_SOBRANTE', 'RECIBIDO_PERFECTO']);

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function formatFecha(fecha) {
  if (!fecha) return '—';
  const [año, mes, dia] = String(fecha).split('-').map(Number);
  return `${dia} ${MESES[mes - 1]} ${año}`;
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

// ── Workaround bug backend ────────────────────────────────────────────────────
// El backend falla con 500 cuando recibe `periodo` porque pasa LocalDate a la
// native query sin anotación @Type — el JDBC driver no puede mapear el tipo.
// Solución: nunca enviar `periodo` al backend; filtrar fechas en el frontend.
// Además, nunca enviar `estado=null`; siempre uno concreto (otro bug del native query).
// ─────────────────────────────────────────────────────────────────────────────
const ESTADOS_POSIBLES = ['PENDIENTE', 'RECIBIDO', 'CANCELADO'];
const PAGE_SIZE = 10;

/** Filtra el array de pedidos por rango de fechas en el frontend. */
function filtrarPorRango(pedidos, desde, hasta) {
  if (!desde && !hasta) return pedidos;
  return pedidos.filter(p => {
    if (!p.fecha) return false;
    const f = String(p.fecha); // 'YYYY-MM-DD' — comparación lexicográfica funciona
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });
}

/** Fecha YYYY-MM-DD de N días atrás. */
function haceNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch de un estado concreto SIN periodo (para evitar el bug de LocalDate
 * en native queries de Spring JPA + PostgreSQL).
 */
async function fetchEstado(token, estadoFiltro, busqueda) {
  const params = new URLSearchParams({ page: 1, limit: 500, estado: estadoFiltro });
  if (busqueda) params.set('q', busqueda);
  const res = await fetch(`${base}/api/inventario/pedidos?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.content ?? data.pedidos ?? [];
}

export default function ReportePedido() {
  const { token }   = useAuth();
  const navigate    = useNavigate();
  const [pedidos, setPedidos]       = useState([]);
  const [kpis, setKpis]             = useState({ totalUnidades: 0, discrepancias: 0 });
  const [busqueda, setBusqueda]     = useState('');
  const [estado, setEstado]         = useState('');
  const [fechaDesde, setFechaDesde] = useState(() => haceNDias(30));
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cargando, setCargando]     = useState(true);
  const [errorRed, setErrorRed]     = useState(false);

  const fetchPedidos = useCallback(async () => {
    setCargando(true);
    setErrorRed(false);
    try {
      // 1. Determinar si es un pseudo-estado de sub-filtro dentro de RECIBIDO
      const isPseudo = PSEUDO_ESTADOS.has(estado);

      // 2. Obtener pedidos del backend (sin periodo — workaround del bug de LocalDate)
      let todos = [];
      const estadosFetch = isPseudo
        ? ['RECIBIDO']
        : (estado ? [estado] : ESTADOS_POSIBLES);
      const resultados = await Promise.all(
        estadosFetch.map(e => fetchEstado(token, e, busqueda))
      );
      todos = resultados.flat();

      // 3. Filtrar por rango de fechas en el frontend
      todos = filtrarPorRango(todos, fechaDesde, fechaHasta);

      // 4. Enriquecer TODOS los pedidos RECIBIDOS con su detalle.
      //    Necesario para: KPI de discrepancias y filtros pseudo-estado.
      const recibidosEnDataset = todos.filter(p => p.estado === 'RECIBIDO');
      const detallesMap = {};

      await Promise.all(
        recibidosEnDataset.map(async (p) => {
          try {
            const r = await fetch(`${base}/api/inventario/pedidos/${p.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) return;
            const det = await r.json();
            const totalRecibido = (det.items ?? []).reduce(
              (s, item) => s + (item.cantidadRecibida ?? 0), 0
            );
            // Comparar en unidades reales: recibida vs cajas×upC + unidades
            const tieneFaltante = (det.items ?? []).some(item => {
              const upC = item.unidadesPorCaja ?? 1;
              const sol = (item.cantidadCajas ?? 0) * upC + (item.cantidadUnidades ?? 0);
              return (item.cantidadRecibida ?? 0) < sol;
            });
            const tieneSobrante = (det.items ?? []).some(item => {
              const upC = item.unidadesPorCaja ?? 1;
              const sol = (item.cantidadCajas ?? 0) * upC + (item.cantidadUnidades ?? 0);
              return (item.cantidadRecibida ?? 0) > sol;
            });
            const tieneDiscrepancia = tieneFaltante || tieneSobrante;
            detallesMap[p.id] = { totalRecibido, tieneDiscrepancia, tieneFaltante, tieneSobrante };
          } catch { /* ignorar errores individuales */ }
        })
      );

      // 5. Si es pseudo-estado, filtrar dataset por criterio de discrepancia
      if (isPseudo) {
        todos = todos.filter(p => {
          const d = detallesMap[p.id];
          if (!d) return false;
          if (estado === 'RECIBIDO_FALTANTE') return d.tieneFaltante;
          if (estado === 'RECIBIDO_SOBRANTE') return d.tieneSobrante;
          if (estado === 'RECIBIDO_PERFECTO') return !d.tieneDiscrepancia;
          return true;
        });
      }

      // 6. Ordenar por fecha descendente
      todos.sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')));

      // 7. Paginación local
      const totalEl  = todos.length;
      const totalPgs = Math.max(1, Math.ceil(totalEl / PAGE_SIZE));
      const safePage = Math.min(Math.max(1, page), totalPgs);
      const from     = (safePage - 1) * PAGE_SIZE;
      const pagina   = todos.slice(from, from + PAGE_SIZE);

      // 8. Aplicar enriquecimiento solo a la página visible
      const paginaEnriquecida = pagina.map(p => {
        const extra = detallesMap[p.id];
        return extra ? { ...p, ...extra } : p;
      });

      setPedidos(paginaEnriquecida);
      setTotal(totalEl);
      setTotalPages(totalPgs);

      const discrepancias = Object.values(detallesMap).filter(d => d.tieneDiscrepancia).length;
      setKpis({
        totalUnidades: todos.reduce((s, p) => s + (p.totalSolicitado ?? 0), 0),
        discrepancias,
      });
    } catch (e) {
      console.warn('fetchPedidos:', e.message);
      setErrorRed(true);
      setPedidos([]);
    } finally {
      setCargando(false);
    }
  }, [token, page, busqueda, estado, fechaDesde, fechaHasta]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);


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
          {/* Barra de búsqueda — crece para llenar el espacio restante */}
          <div className="relative flex-1 min-w-[180px]">
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
              placeholder="Buscar ID de pedido..."
              className="bg-[#f6f3f3] border-none rounded-[8px] pl-10 pr-4 py-2.5 w-full font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20"
            />
          </div>

          {/* Filtro estado */}
          <div className="flex items-center gap-2">
            <span className="font-['Inter'] font-medium text-[14px] text-[#57534e]">Estado:</span>
            <CustomSelect
              value={estado}
              onChange={v => { setEstado(v); setPage(1); }}
              options={[
                { value: '',                   label: 'Todos los estados' },
                { value: 'PENDIENTE',           label: 'Pendiente' },
                { value: 'RECIBIDO',            label: 'Recibido' },
                { value: 'RECIBIDO_PERFECTO',   label: 'Recibido perfecto' },
                { value: 'RECIBIDO_FALTANTE',   label: 'Recibido pero faltante' },
                { value: 'RECIBIDO_SOBRANTE',   label: 'Recibido pero sobrante' },
                { value: 'CANCELADO',           label: 'Faltante' },
              ]}
              size="sm"
            />
          </div>

          {/* Rango de fechas */}
          <div className="flex items-center gap-2">
            <span className="font-['Inter'] font-medium text-[14px] text-[#57534e]">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
              className="bg-[#f6f3f3] rounded-[8px] px-3 py-2 font-['Inter'] text-[13px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 cursor-pointer"
            />
            <span className="font-['Inter'] text-[14px] text-[#a8a29e]">—</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
              className="bg-[#f6f3f3] rounded-[8px] px-3 py-2 font-['Inter'] text-[13px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 cursor-pointer"
            />
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
          ) : errorRed ? (
            <div className="px-6 py-14 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center text-[22px]">
                ⚠️
              </div>
              <p className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c]">
                Error de conexión
              </p>
              <p className="font-['Inter'] font-normal text-[14px] text-[#78716c] max-w-[320px]">
                No se pudo conectar con el servidor. Verifica tu conexión o contacta al equipo técnico.
              </p>
              <button
                onClick={fetchPedidos}
                className="mt-2 px-4 py-2 bg-[#9e2016] text-white font-['Inter'] font-semibold text-[13px] rounded-[8px] cursor-pointer hover:bg-[#c0392b] transition-colors"
              >
                Reintentar
              </button>
            </div>
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
                {/* Nombre + ID corto */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#fef2f2] rounded-[6px] flex items-center justify-center text-[#9e2016] text-[12px]">
                    ≡
                  </div>
                  <div>
                    <p className="font-['Manrope'] font-semibold text-[14px] text-[#1b1b1c]">
                      Pedido · {formatFecha(p.fecha)}
                    </p>
                    <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">
                      #{p.id.toString().substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                {/* Fecha */}
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {formatFecha(p.fecha)}
                </span>
                {/* Total pedido — campo: totalSolicitado */}
                <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c]">
                  {p.totalSolicitado?.toLocaleString() ?? '—'}
                </span>
                {/* Total recibido — enriquecido desde el detalle del pedido */}
                <span className={`font-['Inter'] font-medium text-[14px] ${
                  p.totalRecibido != null ? 'text-[#1b1b1c]' : 'text-[#a8a29e]'
                }`}>
                  {p.totalRecibido != null ? p.totalRecibido.toLocaleString() : '—'}
                </span>
                {/* Badge estado */}
                <span
                  className={`inline-flex items-center gap-1 font-['Inter'] font-bold text-[12px] uppercase px-3 py-1 rounded-full ${
                    p.estado === 'RECIBIDO' && p.tieneFaltante
                      ? 'bg-[#fff7ed] text-[#c2410c]'
                      : p.estado === 'RECIBIDO' && p.tieneSobrante
                      ? 'bg-[#fefce8] text-[#b45309]'
                      : BADGE[p.estado] ?? BADGE.PENDIENTE
                  }`}
                >
                  {p.estado === 'RECIBIDO' && p.tieneFaltante
                    ? '⚠ FALTANTE'
                    : p.estado === 'RECIBIDO' && p.tieneSobrante
                    ? '↑ SOBRANTE'
                    : p.estado === 'CANCELADO'
                    ? 'FALTANTE'
                    : p.estado}
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
