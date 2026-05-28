// src/pages/ventas/ReporteVentasDia.jsx — RF40 + RF41 + RF42
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/ui/CustomSelect';

const BASE_API = import.meta.env.VITE_API_BASE_URL ?? '';

function AlertIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function XIcon({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

// Canal: valor exacto que espera el backend (PLANILLA = comerciantes)
const FILTROS_CANAL = [
  { value: '',           label: 'Todos'         },
  { value: 'VENTANILLA', label: 'Ventanilla'    },
  { value: 'RURAL',      label: 'Rural'         },
  { value: 'PLANILLA',   label: 'Comerciantes'  },
];

// Método de pago — visual; el backend no expone este campo en el reporte diario
const METODOS_PAGO = [
  { value: '',               label: 'Todos los métodos' },
  { value: 'EFECTIVO',       label: 'Efectivo'          },
  { value: 'TRANSFERENCIA',  label: 'Transferencia'     },
  { value: 'OTRO',           label: 'Otro'              },
];

const formatCOP = (n) =>
  '$ ' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });

/**
 * Jackson puede serializar LocalDateTime como array [año,mes,día,h,m,s,ns]
 * o como ISO string "2025-05-27T08:15:30". Se manejan ambos.
 */
function parseHora(horaRaw) {
  if (!horaRaw) return { horaStr: null, ampm: null };
  let h, m;
  if (Array.isArray(horaRaw)) {
    h = horaRaw[3] ?? 0;
    m = horaRaw[4] ?? 0;
  } else {
    const d = new Date(horaRaw);
    h = d.getHours();
    m = d.getMinutes();
  }
  return {
    horaStr: `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    ampm: h < 12 ? 'AM' : 'PM',
  };
}

/* ── Sub-componentes ─────────────────────────────────────────────────── */

function VariacionBadge({ valor }) {
  if (valor === null || valor === undefined) return null;
  const positivo = valor >= 0;
  const abs      = Math.abs(valor);
  const texto    = `${positivo ? '+' : '-'}${Number.isInteger(abs) ? abs : abs.toFixed(1)}%`;
  return (
    <span
      className={`font-['Inter'] font-semibold text-[12px] px-1.5 py-0.5 rounded-[6px] ${
        positivo
          ? 'text-[#16a34a] bg-[#dcfce7]'
          : 'text-[#dc2626] bg-[#fee2e2]'
      }`}
    >
      {texto}
    </span>
  );
}

function BtnPagina({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-[8px] border border-[#e7e5e4] flex items-center justify-center
        transition-colors font-['Inter'] text-[14px]
        ${disabled
          ? 'text-[#d6d3d1] cursor-not-allowed bg-white'
          : 'text-[#78716c] hover:bg-[#f6f3f3] bg-white cursor-pointer'
        }`}
    >
      {children}
    </button>
  );
}

/* ── Página principal ────────────────────────────────────────────────── */

export default function ReporteVentasDia() {
  const { token } = useAuth();

  // RF40 / RF42 — resumen por canal
  const [resumen,      setResumen]      = useState(null);
  const [cargandoKpi,  setCargandoKpi]  = useState(true);
  const [errorKpi,     setErrorKpi]     = useState(null);

  // RF41 — tabla de transacciones
  const [transacciones,   setTransacciones]   = useState([]);
  const [totalElementos,  setTotalElementos]  = useState(0);
  const [totalPages,      setTotalPages]      = useState(1);
  const [cargandoTx,      setCargandoTx]      = useState(true);
  const [errorTx,         setErrorTx]         = useState(null);

  const [canalFiltro, setCanalFiltro] = useState('');
  const [metodoPago,  setMetodoPago]  = useState('');
  const [busqueda,    setBusqueda]    = useState('');
  const [page,        setPage]        = useState(1);
  const LIMIT = 10;

  /* ── Fetch resumen (RF40 + RF42) ─────────────────────────────────── */
  useEffect(() => {
    setCargandoKpi(true);
    setErrorKpi(null);
    fetch(`${BASE_API}/api/reportes/diario`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error('session');
          if (res.status === 403) throw new Error('forbidden');
          if (res.status >= 500) throw new Error('server');
          throw new Error('generic');
        }
        return res.json();
      })
      .then(setResumen)
      .catch((e) => {
        const msgs = {
          session:   'Tu sesión ha expirado. Vuelve a iniciar sesión.',
          forbidden: 'No tienes permisos para ver el resumen del día.',
          server:    'Error en el servidor al cargar el resumen. Intenta más tarde.',
        };
        setErrorKpi(e instanceof TypeError
          ? 'Sin conexión a internet. No se pudo cargar el resumen.'
          : (msgs[e.message] ?? 'No se pudo cargar el resumen de ventas del día.')
        );
      })
      .finally(() => setCargandoKpi(false));
  }, [token]);

  /* ── Fetch transacciones (RF41) ──────────────────────────────────── */
  const fetchTransacciones = useCallback(async () => {
    setCargandoTx(true);
    setErrorTx(null);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (canalFiltro) params.set('canal', canalFiltro);

      const res = await fetch(
        `${BASE_API}/api/reportes/diario/transacciones?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        if (res.status === 401) throw new Error('session');
        if (res.status === 403) throw new Error('forbidden');
        if (res.status >= 500) throw new Error('server');
        throw new Error('generic');
      }

      const data = await res.json();
      setTransacciones(data.transacciones ?? []);
      setTotalElementos(data.totalElementos ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      const msgs = {
        session:   'Tu sesión ha expirado. Vuelve a iniciar sesión.',
        forbidden: 'No tienes permisos para ver las transacciones.',
        server:    'Error en el servidor al cargar las transacciones. Intenta más tarde.',
      };
      setErrorTx(e instanceof TypeError
        ? 'Sin conexión a internet. No se pudieron cargar las transacciones.'
        : (msgs[e.message] ?? 'No se pudieron cargar las transacciones del día.')
      );
    } finally {
      setCargandoTx(false);
    }
  }, [token, page, canalFiltro]);

  useEffect(() => { fetchTransacciones(); }, [fetchTransacciones]);

  const handleCanalChange = (canal) => { setCanalFiltro(canal); setPage(1); };

  // Filtrado local: búsqueda por ID/cliente + método de pago
  const txFiltradas = transacciones.filter(tx => {
    const matchBusqueda = !busqueda.trim() ||
      tx.id?.toLowerCase().includes(busqueda.toLowerCase()) ||
      tx.clienteOComerciante?.toLowerCase().includes(busqueda.toLowerCase());
    const matchMetodo = !metodoPago || tx.metodoPago === metodoPago;
    return matchBusqueda && matchMetodo;
  });

  /* ── Datos para las KPI cards ─────────────────────────────────────── */
  const canalesKpi = resumen ? [
    {
      label: 'Ventanilla',
      valor: resumen.ingresoVentanilla ?? 0,
      count: resumen.transaccionesVentanilla ?? 0,
      variacion: resumen.variacionVentanilla ?? null,
      icono: (
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18" className="text-[#9e2016]">
          <rect x="1" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M1 9h16M6 9v8M12 9v8" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M6 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
    {
      label: 'Rural',
      valor: resumen.ingresoRural ?? 0,
      count: resumen.transaccionesRural ?? 0,
      variacion: resumen.variacionRural ?? null,
      icono: (
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18" className="text-[#9e2016]">
          <rect x="1" y="6" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M1 10h16" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="5" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="13" cy="15" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M5 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
    {
      label: 'Comerciantes',
      valor: resumen.ingresoComerciantes ?? 0,
      count: resumen.transaccionesComerciantes ?? 0,
      variacion: resumen.variacionComerciantes ?? null,
      icono: (
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18" className="text-[#9e2016]">
          <path d="M2 7h14l-1.5 9H3.5L2 7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M1 4h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M6 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
      ),
    },
  ] : [];

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 animate-fade-in-up">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div>
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#9e2016] mb-1">
            Cierre de Caja
          </p>
          <h1 className="font-['Manrope'] font-bold text-[36px] text-[#1b1b1c] tracking-[-0.9px] leading-[42px]">
            Reporte de Ventas del Día
          </h1>
          <p className="font-['Inter'] font-normal text-[16px] text-[#78716c] mt-1">
            Seguimiento detallado de transacciones diarias y rendimiento de canales.
          </p>
        </div>

        {/* ── RF40 — KPI cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {cargandoKpi ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-[12px] h-[140px] animate-pulse border border-[#f5f5f4] ${
                  i === 3 ? 'bg-[#c0392b]/20' : 'bg-white'
                }`}
              />
            ))
          ) : errorKpi ? (
            <div className="col-span-4 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
              <span className="shrink-0 mt-0.5"><AlertIcon /></span>
              <span className="flex-1 font-inter">{errorKpi}</span>
              <button onClick={() => setErrorKpi(null)} className="shrink-0 opacity-60 hover:opacity-100 p-0.5 transition-opacity">
                <XIcon size={13} />
              </button>
            </div>
          ) : (
            <>
              {/* Cards de canales (RF40) */}
              {canalesKpi.map((c) => (
                <div
                  key={c.label}
                  className="bg-white rounded-[12px] border border-[#f5f5f4]
                    drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-6 flex flex-col"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 bg-[#f6f3f3] rounded-[8px] flex items-center justify-center">
                      {c.icono}
                    </div>
                    <VariacionBadge valor={c.variacion} />
                  </div>
                  <span className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mt-4">
                    {c.label}
                  </span>
                  <span className="font-['Manrope'] font-bold text-[22px] text-[#1b1b1c] mt-1">
                    {formatCOP(c.valor)}
                  </span>
                </div>
              ))}

              {/* RF42 — Card total del día */}
              <div className="bg-[#9e2016] rounded-[12px] p-6 flex flex-col">
                <div className="w-9 h-9 bg-white/20 rounded-[8px] flex items-center justify-center">
                  <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                    <rect x="1" y="4" width="16" height="10" rx="2" stroke="white" strokeWidth="1.4"/>
                    <circle cx="9" cy="9" r="2.5" stroke="white" strokeWidth="1.4"/>
                    <path d="M1 7h2M15 7h2M1 11h2M15 11h2"
                      stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-white/70 mt-4">
                  Total del Día (COP)
                </span>
                <span className="font-['Manrope'] font-bold text-[28px] text-white mt-1 leading-[34px]">
                  {formatCOP(resumen?.totalIngresos ?? 0)}
                </span>
                <span className="font-['Inter'] text-[12px] text-white/60 mt-1">
                  {resumen?.totalTransacciones ?? 0} transacciones
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── RF41 — Filtros ─────────────────────────────────────── */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col gap-5">

          {/* Buscador — filtra por ID o nombre de cliente en los datos cargados */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]"
              width="16" height="16" fill="none" viewBox="0 0 16 16"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar # por factura o cliente..."
              className="bg-[#f6f3f3] border-none rounded-[8px] pl-9 pr-4 py-2.5 w-full
                font-['Inter'] text-[14px] text-[#1b1b1c] outline-none
                focus:ring-2 focus:ring-[#9e2016]/20"
            />
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">

            {/* Tipo de venta */}
            <div>
              <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-3">
                Tipo de Venta
              </p>
              <div className="flex gap-2 flex-wrap">
                {FILTROS_CANAL.map(f => (
                  <button
                    key={f.value}
                    onClick={() => handleCanalChange(f.value)}
                    className={`px-4 py-2 rounded-[8px] font-['Inter'] font-medium text-[14px]
                      cursor-pointer transition-colors ${
                      canalFiltro === f.value
                        ? 'bg-[#9e2016] text-white'
                        : 'bg-white border border-[#e7e5e4] text-[#1b1b1c] hover:border-[#9e2016]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Método de pago — visual; pendiente soporte en backend */}
            <div className="min-w-[210px]">
              <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-3">
                Método de Pago
              </p>
              <CustomSelect
                value={metodoPago}
                onChange={setMetodoPago}
                options={METODOS_PAGO}
              />
            </div>

          </div>
        </div>

        {/* ── RF41 — Tabla de transacciones ──────────────────────── */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] overflow-hidden">

          {/* Encabezados — Hora | ID Venta | Cliente | Productos | Total | Método
               Hora y totales: fijos. ID/Cliente/Productos: fr para llenar el ancho. */}
          <div className="grid grid-cols-[70px_2fr_2.2fr_1.8fr_110px_120px] gap-4 px-6 py-3
            bg-[#fafaf9] border-b border-[#f5f5f4]">
            {['Hora', 'ID Venta', 'Cliente', 'Productos', 'Total (COP)', 'Método'].map(h => (
              <span
                key={h}
                className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Estado: cargando */}
          {cargandoTx && (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[70px_2fr_2.2fr_1.8fr_110px_120px] gap-4 px-6 py-5
                  border-b border-[#fafaf9] animate-pulse"
              >
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} className="h-4 bg-[#f6f3f3] rounded" />
                ))}
              </div>
            ))
          )}

          {/* Estado: error */}
          {!cargandoTx && errorTx && (
            <div className="px-6 py-6">
              <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down flex items-start gap-2">
                <span className="shrink-0 mt-0.5"><AlertIcon /></span>
                <span className="flex-1 font-inter">{errorTx}</span>
                <button onClick={() => setErrorTx(null)} className="shrink-0 opacity-60 hover:opacity-100 p-0.5 transition-opacity">
                  <XIcon size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Estado: sin resultados */}
          {!cargandoTx && !errorTx && txFiltradas.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="font-['Inter'] text-[14px] text-[#a8a29e]">
                No hay transacciones para los filtros seleccionados.
              </p>
            </div>
          )}

          {/* Filas */}
          {!cargandoTx && !errorTx && txFiltradas.map((tx) => {
            const { horaStr, ampm } = parseHora(tx.hora);
            // PLANILLA = Comerciantes en la UI
            const tipoLabel = tx.tipo === 'PLANILLA' ? 'COMERCIANTES' : (tx.tipo ?? '');

            return (
              <div
                key={tx.id}
                className="grid grid-cols-[70px_2fr_2.2fr_1.8fr_110px_120px] gap-4 px-6 py-5
                  border-b border-[#fafaf9] hover:bg-[#fafaf9] transition-colors items-start"
              >
                {/* Hora */}
                <div>
                  {horaStr ? (
                    <>
                      <p className="font-['Manrope'] font-semibold text-[14px] text-[#1b1b1c]">
                        {horaStr}
                      </p>
                      <p className="font-['Inter'] font-normal text-[12px] text-[#a8a29e]">
                        {ampm}
                      </p>
                    </>
                  ) : (
                    <p className="font-['Inter'] text-[12px] text-[#a8a29e]">—</p>
                  )}
                </div>

                {/* ID Venta */}
                <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                  #{tx.id}
                </span>

                {/* Cliente + badge de canal */}
                <div>
                  {tx.clienteOComerciante ? (
                    <p className="font-['Manrope'] font-semibold text-[15px] text-[#1b1b1c] leading-[20px]">
                      {tx.clienteOComerciante}
                    </p>
                  ) : tx.tipo !== 'VENTANILLA' && (
                    <p className="font-['Manrope'] font-semibold text-[15px] text-[#1b1b1c] leading-[20px]">
                      —
                    </p>
                  )}
                  {tipoLabel && (
                    <span className={`font-['Inter'] font-bold text-[11px] uppercase ${
                      tx.tipo === 'VENTANILLA' ? 'text-[#9e2016]' : 'text-[#57534e]'
                    }`}>
                      {tipoLabel}
                    </span>
                  )}
                </div>

                {/* Productos — detalle por producto con cantidad y tipo */}
                <div className="flex flex-col gap-0.5">
                  {tx.detallesProductos?.length ? (
                    tx.detallesProductos.map((d, i) => (
                      <p key={i} className="font-['Inter'] font-normal text-[14px] text-[#57534e] leading-[20px]">
                        {d.nombre}{' '}
                        <span className="text-[#a8a29e] text-[12px]">
                          (x{d.cantidad}{d.tipoUnidad === 'CAJA' ? 'c' : 'u'})
                        </span>
                      </p>
                    ))
                  ) : (
                    <p className="font-['Inter'] font-normal text-[14px] text-[#57534e] leading-[20px]">
                      {tx.productos || '—'}
                    </p>
                  )}
                </div>

                {/* Total */}
                <span className="font-['Manrope'] font-semibold text-[15px] text-[#1b1b1c] pt-0.5">
                  {formatCOP(tx.total)}
                </span>

                {/* Método de pago */}
                <span className="pt-0.5">
                  {tx.metodoPago ? (
                    <span className="inline-flex items-center bg-[#f6f3f3] text-[#57534e]
                      font-['Inter'] font-bold text-[11px] uppercase rounded-full px-3 py-1">
                      {tx.metodoPago}
                    </span>
                  ) : (
                    <span className="inline-flex items-center bg-[#f6f3f3] text-[#d6d3d1]
                      font-['Inter'] font-bold text-[11px] uppercase rounded-full px-3 py-1">
                      —
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          {/* Footer con paginación */}
          <div className="flex items-center justify-between px-6 py-4">
            <p className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">
              Mostrando {txFiltradas.length} de {totalElementos} transacciones registradas hoy.
            </p>
            <div className="flex items-center gap-1">
              <BtnPagina
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹
              </BtnPagina>
              <span className="w-8 h-8 flex items-center justify-center font-['Inter'] text-[13px] text-[#78716c]">
                {page}
              </span>
              <BtnPagina
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                ›
              </BtnPagina>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
