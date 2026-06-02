import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { imprimirPlanilla, liquidarPlanilla } from '../../services/ventasService';

const MESES_LARGO = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
];

function formatFechaBadge(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES_LARGO[m - 1]}, ${y}`;
}

function formatCOP(n) {
  return '$' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

export default function PlanillaDetalle() {
  const navigate                       = useNavigate();
  const location                       = useLocation();
  const { comercianteId, planillaId }  = location.state ?? {};

  const [datos,        setDatos]        = useState(null);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState('');
  const [imprimiendo,  setImprimiendo]  = useState(false);
  const [entradas,     setEntradas]     = useState({});   // { itemId → valor }
  const [cerrando,     setCerrando]     = useState(false);
  const [errorCierre,  setErrorCierre]  = useState('');

  const estaAbierta = datos && !datos.cerrada;

  useEffect(() => {
    if (!planillaId) {
      setError('No existe una planilla en esta fecha');
      setCargando(false);
      return;
    }
    let vivo = true;
    setCargando(true);
    imprimirPlanilla(planillaId)
      .then((data) => {
        if (!vivo) return;
        setDatos(data);
        // Inicializar entradas en 0 para cada ítem (para cierre diario de planillas abiertas)
        if (data?.items) {
          const init = {};
          data.items.forEach(it => { init[it.id] = 0; });
          setEntradas(init);
        }
      })
      .catch(() => { if (vivo) setError('No existe una planilla en esta fecha'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [planillaId]);

  async function handleCierreDiario() {
    setCerrando(true);
    setErrorCierre('');
    try {
      const devoluciones = (datos?.items ?? []).map(it => ({
        detalleId:         it.id,
        unidadesDevueltas: Math.min(Number(entradas[it.id]) || 0, it.unidadesDespachadas ?? 0),
      }));
      await liquidarPlanilla(planillaId, devoluciones);
      navigate(-1);
    } catch (e) {
      const msg = e?.response?.data?.mensaje ?? e?.response?.data?.message ?? '';
      setErrorCierre(msg || 'No se pudo realizar el cierre. Intenta de nuevo.');
    } finally {
      setCerrando(false);
    }
  }

  async function handleImprimir() {
    setImprimiendo(true);
    try {
      await imprimirPlanilla(planillaId);
    } finally {
      setImprimiendo(false);
      window.print();
    }
  }

  const items = datos?.items ?? [];

  const totalLiquidacion = items.reduce((acc, it) => {
    const vendidas = (it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0);
    return acc + (it.ganancia ?? vendidas * Number(it.precioVenta ?? 0));
  }, 0);

  const nombreComerciante = datos?.comercianteNombre ?? '—';
  const idComerciante     = datos?.comercianteId ?? comercianteId ?? '';
  const fotoUrl           = datos?.fotoUrl ?? null;
  const iniciales         = nombreComerciante
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <AppLayout>
      <style>{`
        @media print {
          nav, aside, header, .no-print { display: none !important; }
          .print-area { width: 100%; }
          body { background: white; }
        }
      `}</style>

      <div className="flex flex-col gap-4 sm:gap-5 animate-fade-in-up pb-40 sm:pb-28">

        {/* ── Volver al comerciante ── */}
        {idComerciante && (
          <button
            onClick={() => navigate(`/ventas/comerciantes/${idComerciante}/informacion`, {
              state: {
                comerciante: {
                  id: idComerciante,
                  nombre: nombreComerciante !== '—' ? nombreComerciante : '',
                  fotoUrl,
                },
              },
            })}
            className="flex items-center gap-1.5 text-[#78716c] hover:text-[#1b1b1c] transition-colors w-fit font-['Inter'] text-[13px] cursor-pointer no-print"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {nombreComerciante !== '—' ? `Volver a ${nombreComerciante}` : 'Volver al comerciante'}
          </button>
        )}

        
        {/* Título + info comerciante */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="font-['Manrope'] font-extrabold text-[26px] sm:text-[36px] leading-tight text-[#1b1b1c]">
              PLANILLA
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={nombreComerciante}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#f6f3f3] flex items-center justify-center shrink-0">
                  <span className="font-['Manrope'] font-bold text-[10px] text-[#9e2016]">
                    {iniciales}
                  </span>
                </div>
              )}
              <span className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">
                {nombreComerciante}
              </span>
              {idComerciante && (
                <span className="font-['Inter'] text-[12px] text-[#a8a29e] truncate max-w-[160px]">
                  ID: {idComerciante}
                </span>
              )}
            </div>
          </div>

          {datos?.fecha && (
            <span className="self-start sm:self-auto bg-[#9e2016] text-white font-['Inter'] font-bold text-[11px] uppercase tracking-[0.6px] px-3 py-1.5 rounded-[8px] no-print">
              FECHA: {formatFechaBadge(datos.fecha)}
            </span>
          )}
        </div>

        {/* ── Contenido principal ── */}
        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <svg className="animate-spin w-8 h-8 text-[#9e2016]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24">
            <p className="font-['Inter'] text-[15px] text-[#a8a29e]">{error}</p>
          </div>
        ) : (
          <>
            {/* Tabla de productos — desktop */}
            <div className="hidden sm:block bg-white rounded-[16px] border border-[#f5f5f4] overflow-hidden print-area">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[#f5f5f4]">
                      <th className="px-5 py-3 text-left font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                        Producto
                      </th>
                      <th className="px-5 py-3 text-center font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                        Salida (Und)
                      </th>
                      <th className="px-5 py-3 text-center font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                        Entrada (Und)
                      </th>
                      <th className="px-5 py-3 text-center font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                        Vendidas
                      </th>
                      <th className="px-5 py-3 text-center font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                        Precio Unitario
                      </th>
                      <th className="px-5 py-3 text-right font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                        Total ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const devActual = estaAbierta
                        ? (Number(entradas[it.id]) || 0)
                        : (it.unidadesDevueltas ?? 0);
                      const vendidas  = (it.unidadesDespachadas ?? 0) - devActual;
                      const total     = estaAbierta
                        ? Math.max(0, vendidas) * Number(it.precioVenta ?? 0)
                        : (it.ganancia ?? vendidas * Number(it.precioVenta ?? 0));
                      const errFila   = estaAbierta && devActual > (it.unidadesDespachadas ?? 0);
                      return (
                        <tr key={it.id ?? it.productoId ?? idx} className="border-b border-[#f5f5f4] last:border-b-0">
                          <td className="px-5 py-4 font-['Inter'] text-[14px] text-[#1b1b1c]">
                            {it.nombre ?? it.productoNombre ?? '—'}
                          </td>
                          <td className="px-5 py-4 text-center font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                            {it.unidadesDespachadas ?? 0}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {estaAbierta ? (
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number" min="0"
                                  value={entradas[it.id] ?? 0}
                                  onChange={e => setEntradas(prev => ({
                                    ...prev,
                                    [it.id]: Math.max(0, Number(e.target.value) || 0),
                                  }))}
                                  className={`w-20 rounded-[8px] px-2 py-1.5 text-center font-['Inter'] text-[14px] text-[#1b1b1c] outline-none transition-all ${
                                    errFila
                                      ? 'border border-[#9e2016] bg-[#fff1f0]'
                                      : 'border border-transparent bg-[#f6f3f3] focus:border-[#9e2016]'
                                  }`}
                                />
                                {errFila && <p className="font-['Inter'] text-[10px] text-[#9e2016]">Supera lo despachado</p>}
                              </div>
                            ) : (
                              <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                                {it.unidadesDevueltas ?? 0}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center font-['Inter'] text-[14px] text-[#a8a29e]">
                            {Math.max(0, vendidas)}
                          </td>
                          <td className="px-5 py-4 text-center font-['Inter'] text-[14px] text-[#1b1b1c]">
                            {formatCOP(it.precioVenta)}
                          </td>
                          <td className="px-5 py-4 text-right font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                            {formatCOP(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cards por producto — mobile */}
            <div className="sm:hidden bg-white rounded-[16px] border border-[#f5f5f4] overflow-hidden print-area">
              {items.map((it, idx) => {
                const vendidas = (it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0);
                const total    = it.ganancia ?? vendidas * Number(it.precioVenta ?? 0);
                return (
                  <div key={it.productoId ?? idx} className="px-4 py-3 border-b border-[#f5f5f4] last:border-b-0">
                    <p className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c] mb-2">
                      {it.nombre ?? it.productoNombre ?? '—'}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      <div className="flex justify-between">
                        <span className="font-['Inter'] text-[12px] text-[#a8a29e]">Salida</span>
                        <span className="font-['Manrope'] font-bold text-[13px] text-[#1b1b1c]">
                          {it.unidadesDespachadas ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-['Inter'] text-[12px] text-[#a8a29e]">Entrada</span>
                        <span className="font-['Manrope'] font-bold text-[13px] text-[#1b1b1c]">
                          {it.unidadesDevueltas ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-['Inter'] text-[12px] text-[#a8a29e]">Vendidas</span>
                        <span className="font-['Inter'] text-[13px] text-[#a8a29e]">{vendidas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-['Inter'] text-[12px] text-[#a8a29e]">Precio</span>
                        <span className="font-['Inter'] text-[13px] text-[#1b1b1c]">
                          {formatCOP(it.precioVenta)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-[#f5f5f4]">
                      <span className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                        Total
                      </span>
                      <span className="font-['Manrope'] font-bold text-[15px] text-[#1b1b1c]">
                        {formatCOP(total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botón imprimir */}
            <div className="no-print">
              <button
                onClick={handleImprimir}
                disabled={imprimiendo}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-60 text-white font-['Manrope'] font-bold text-[14px] rounded-[10px] px-5 py-2.5 transition-colors cursor-pointer shadow-sm"
              >
                {imprimiendo ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                    <polyline points="3.5 5 3.5 1.5 10.5 1.5 10.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.5 9.5H2A1 1 0 0 1 1 8.5V6A1 1 0 0 1 2 5h10a1 1 0 0 1 1 1v2.5a1 1 0 0 1-1 1h-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3.5" y="8" width="7" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                )}
                {imprimiendo ? 'Preparando…' : 'Imprimir Plantilla'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer fijo */}
      {!cargando && !error && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#f0fdf4] border-t border-[#bbf7d0] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 z-40 no-print">

          {/* Total */}
          <div className="flex items-center gap-3 flex-1">
            <svg width="20" height="20" fill="none" viewBox="0 0 22 22" className="text-[#16a34a] shrink-0">
              <rect x="2" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 2v4M8 2v4M2 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 14h8M7 17h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div className="flex flex-col">
              <span className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.6px] text-[#a8a29e]">
                Total Liquidación
              </span>
              <span className="font-['Manrope'] font-extrabold text-[22px] sm:text-[26px] leading-tight text-[#16a34a]">
                {formatCOP(totalLiquidacion)}
              </span>
            </div>
          </div>

          {/* Error cierre */}
          {errorCierre && (
            <p className="font-['Inter'] text-[12px] text-[#9e2016] text-center sm:text-left flex-1">{errorCierre}</p>
          )}

          {/* Botones */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 sm:flex-none bg-[#f6f3f3] hover:bg-[#e7e5e4] text-[#1b1b1c] font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-5 py-2.5 sm:py-3 transition-colors cursor-pointer text-center"
            >
              Volver
            </button>
            {estaAbierta && (
              <button
                onClick={handleCierreDiario}
                disabled={cerrando || Object.values(entradas).some((v, i) => {
                  const it = items[i];
                  return Number(v) > (it?.unidadesDespachadas ?? 0);
                })}
                className="flex-1 sm:flex-none bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-60 disabled:cursor-not-allowed text-white font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-5 py-2.5 sm:py-3 transition-colors cursor-pointer shadow-sm text-center flex items-center justify-center gap-2"
              >
                {cerrando ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Cerrando...</>
                ) : 'Hacer Cierre Diario ✓'}
              </button>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
