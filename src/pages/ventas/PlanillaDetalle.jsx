import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import EncabezadoDocumento from '../../components/EncabezadoDocumento';
import ContenidoCarga from '../../components/ui/ContenidoCarga';
import { useIdentidad } from '../../context/IdentidadContext';
import { useAuth } from '../../context/AuthContext';
import { imprimirPlanilla } from '../../services/ventasService';
import ModalProrroga from '../../components/ventas/ModalProrroga';
import { etiquetaEsquema, formatoFecha, estadoPlanilla } from '../../components/ventas/creditoUtils';

function SpinnerSvg() {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
}

const MESES_LARGO = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
];

function formatFechaBadge(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES_LARGO[m - 1]}, ${y}`;
}

function formatFechaCorta(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatCOP(n) {
  return '$' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

export default function PlanillaDetalle() {
  const navigate                       = useNavigate();
  const location                       = useLocation();
  const { comercianteId, comerciante, planillaId, liquidacion: liquidacionRecienCerrada } = location.state ?? {};
  const { identidad }                  = useIdentidad();
  const { rol }                        = useAuth();
  const esGerente                      = rol === 'ADMINISTRADOR';
  const [prorrogaAbierta, setProrrogaAbierta] = useState(false);
  const [fechaLimiteNueva, setFechaLimiteNueva] = useState(null);
  const [avisoProrroga, setAvisoProrroga]       = useState('');

  const [datos,        setDatos]        = useState(null);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState('');
  const [imprimiendo,  setImprimiendo]  = useState(false);

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
      .then((data) => { if (vivo) setDatos(data); })
      .catch(() => { if (vivo) setError('No existe una planilla en esta fecha'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [planillaId]);

  // El cierre se hace en una sola pantalla (devoluciones, resumen y efectivo recibido).
  function irACierreDiario() {
    navigate(`/ventas/comerciantes/${comerciante.id}/planilla-hoy`, {
      replace: true,
      state: { comerciante, planillaId },
    });
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

  /* RF66 — valores de la liquidación: los que acaba de calcular PlanillaDiaria, si viene de
     allí; si no, los que guarda el backend. Las planillas anteriores a la Iteración 3 no
     traen esquema ni efectivo: se toman MARGEN y el total como pagado (migración V10). */
  const cerrada = !!datos?.cerrada || !!liquidacionRecienCerrada;
  const montoCobrado = liquidacionRecienCerrada?.montoCobrado
    ?? datos?.montoCobrado ?? datos?.totalGanancia ?? totalLiquidacion;
  const efectivoRecibido = liquidacionRecienCerrada?.efectivoRecibido ?? datos?.efectivoRecibido ?? montoCobrado;
  const liq = {
    esquema:      liquidacionRecienCerrada?.esquemaAplicado ?? datos?.esquemaAplicado ?? 'MARGEN',
    valorEsquema: liquidacionRecienCerrada?.valorEsquema ?? datos?.valorEsquema ?? null,
    totalVendido: liquidacionRecienCerrada?.totalVendido ?? datos?.totalVendido ?? null,
    ganancia:     liquidacionRecienCerrada?.gananciaComerciante ?? datos?.gananciaComerciante ?? null,
    montoCobrado,
    efectivoRecibido,
    saldo:        liquidacionRecienCerrada?.saldo ?? datos?.saldo ?? Math.max(0, montoCobrado - efectivoRecibido),
    fechaLimite:  fechaLimiteNueva ?? liquidacionRecienCerrada?.fechaLimitePago ?? datos?.fechaLimitePago ?? null,
  };
  /* RF66 — avisos de la liquidación (no impiden cerrarla).
     Recién liquidada: advertencias [{ tipo, codigo, mensaje }] de POST /liquidar.
     Planilla guardada: con MARGEN, los productos vendidos sin precio al público (items[].precioPublico)
     no generan ganancia para el comerciante; se arma el mismo mensaje que da el backend.
     Las planillas anteriores al esquema traen la ganancia en null: tienen su propio aviso. */
  const avisosLiquidacion = (() => {
    if (Array.isArray(liquidacionRecienCerrada?.advertencias)) {
      return liquidacionRecienCerrada.advertencias.map((a) => a.mensaje ?? a.codigo ?? a.tipo).filter(Boolean);
    }
    if (liq.esquema !== 'MARGEN' || liq.ganancia == null) return [];
    const sinPrecio = items
      .filter((it) => (it.unidadesVendidas ?? ((it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0))) > 0)
      .filter((it) => !(Number(it.precioPublico) > 0))
      .map((it) => it.productoNombre ?? it.nombre ?? 'un producto');
    return sinPrecio.length
      ? [`Sin precio al público, no generan ganancia para el comerciante: ${sinPrecio.join(', ')}.`]
      : [];
  })();

  const estadoSaldo = liq.saldo > 0 && liq.fechaLimite
    ? estadoPlanilla({ saldo: liq.saldo, fechaLimitePago: liq.fechaLimite })
    : null;

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

        {/* ── Encabezado con la identidad de la distribuidora — solo al imprimir ── */}
        <div className="hidden print:block">
          <EncabezadoDocumento
            identidad={datos?.identidad ?? identidad}
            subtitulo={datos?.fecha ? `Planilla diaria · ${formatFechaCorta(datos.fecha)}` : 'Planilla diaria'}
            detalle={`Comerciante: ${nombreComerciante}`}
          />
        </div>

        {/* ── Volver al comerciante ── */}
        {idComerciante && (
          <button
            onClick={() => navigate(-1)}
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
                  <span className="font-['Manrope'] font-bold text-[10px] text-primary">
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
            <span className="self-start sm:self-auto bg-primary text-white font-['Inter'] font-bold text-[11px] uppercase tracking-[0.6px] px-3 py-1.5 rounded-[8px] no-print">
              FECHA: {formatFechaBadge(datos.fecha)}
            </span>
          )}
        </div>

        {/* ── Contenido principal ── */}
        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
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
                      const vendidas = (it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0);
                      const total    = it.ganancia ?? vendidas * Number(it.precioVenta ?? 0);
                      return (
                        <tr key={it.id ?? it.productoId ?? idx} className="border-b border-[#f5f5f4] last:border-b-0">
                          <td className="px-5 py-4 font-['Inter'] text-[14px] text-[#1b1b1c]">
                            {it.nombre ?? it.productoNombre ?? '—'}
                          </td>
                          <td className="px-5 py-4 text-center font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                            {it.unidadesDespachadas ?? 0}
                          </td>
                          <td className="px-5 py-4 text-center font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                            {estaAbierta ? '—' : (it.unidadesDevueltas ?? 0)}
                          </td>
                          <td className="px-5 py-4 text-center font-['Inter'] text-[14px] text-[#a8a29e]">
                            {estaAbierta ? '—' : Math.max(0, vendidas)}
                          </td>
                          <td className="px-5 py-4 text-center font-['Inter'] text-[14px] text-[#1b1b1c]">
                            {formatCOP(it.precioVenta)}
                          </td>
                          <td className="px-5 py-4 text-right font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">
                            {estaAbierta ? '—' : formatCOP(total)}
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
                          {estaAbierta ? '—' : (it.unidadesDevueltas ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-['Inter'] text-[12px] text-[#a8a29e]">Vendidas</span>
                        <span className="font-['Inter'] text-[13px] text-[#a8a29e]">{estaAbierta ? '—' : vendidas}</span>
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
                        {estaAbierta ? '—' : formatCOP(total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── RF66: comprobante de la liquidación ── */}
            {cerrada && (
              <div className="bg-white rounded-[16px] border border-[#f5f5f4] print-area">
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#f5f5f4]">
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1b1b1c]">Liquidación</h2>
                    <p className="font-['Inter'] text-[12px] text-[#a8a29e]">Planilla bloqueada con el esquema vigente al liquidar</p>
                  </div>
                  <span className="font-['Inter'] font-semibold text-[11px] px-2.5 py-1 rounded-full bg-[#fef2f2] text-primary whitespace-nowrap">
                    {etiquetaEsquema(liq.esquema, liq.valorEsquema)}
                  </span>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 px-5 py-4 font-['Inter'] text-[14px]">
                  {liq.totalVendido != null && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#78716c]">Total vendido (precio público)</dt>
                      <dd className="text-[#1b1b1c]">{formatCOP(liq.totalVendido)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#78716c]">Ganancia del comerciante</dt>
                    <dd className="text-[#16a34a]">{liq.ganancia != null ? formatCOP(liq.ganancia) : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#78716c]">Monto cobrado</dt>
                    <dd className="font-['Manrope'] font-bold text-[#1b1b1c]">{formatCOP(liq.montoCobrado)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#78716c]">Efectivo recibido</dt>
                    <dd className="text-[#1b1b1c]">{formatCOP(liq.efectivoRecibido)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[#78716c]">Saldo a crédito</dt>
                    <dd className={`font-['Manrope'] font-bold ${liq.saldo > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
                      {liq.saldo > 0 ? formatCOP(liq.saldo) : 'Pagada'}
                    </dd>
                  </div>
                  {liq.saldo > 0 && (
                    <div className="flex justify-between gap-3 items-center">
                      <dt className="text-[#78716c]">Fecha límite de pago</dt>
                      <dd className="flex items-center gap-2">
                        <span className="text-[#1b1b1c]">{formatoFecha(liq.fechaLimite)}</span>
                        {estadoSaldo && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full no-print ${estadoSaldo.clase}`}>{estadoSaldo.label}</span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
                {avisosLiquidacion.map((m) => (
                  <p key={m} className="mx-5 mb-3 px-3 py-2 rounded-[10px] bg-[#fffbeb] text-[#92400e] font-['Inter'] text-[12px]">{m}</p>
                ))}
                {liq.ganancia == null && (
                  <p className="px-5 pb-3 font-['Inter'] text-[11px] text-[#a8a29e]">
                    Planilla anterior al esquema de liquidación: no tiene la ganancia del comerciante registrada.
                  </p>
                )}
                {avisoProrroga && (
                  <p className="mx-5 mb-3 px-3 py-2 rounded-[10px] bg-[#f0fdf4] text-[#166534] font-['Inter'] text-[12px] no-print">{avisoProrroga}</p>
                )}
                {esGerente && liq.saldo > 0 && (
                  <div className="px-5 py-3 border-t border-[#f5f5f4] flex justify-end no-print">
                    <button
                      type="button"
                      onClick={() => setProrrogaAbierta(true)}
                      className="px-4 py-2 border border-[#e7e5e4] rounded-[10px] font-['Inter'] font-semibold text-[13px] text-primary hover:bg-[#fef2f2] transition cursor-pointer"
                    >
                      Extender fecha límite
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Botón imprimir */}
            <div className="no-print">
              <button
                onClick={handleImprimir}
                disabled={imprimiendo}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-['Manrope'] font-bold text-[14px] rounded-[10px] px-5 py-2.5 transition-colors cursor-pointer shadow-sm"
              >
                <ContenidoCarga cargando={imprimiendo} textoCargando="Preparando…" spinner={<SpinnerSvg />}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                    <polyline points="3.5 5 3.5 1.5 10.5 1.5 10.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.5 9.5H2A1 1 0 0 1 1 8.5V6A1 1 0 0 1 2 5h10a1 1 0 0 1 1 1v2.5a1 1 0 0 1-1 1h-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3.5" y="8" width="7" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  Imprimir Plantilla
                </ContenidoCarga>
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
                {cerrada ? 'Monto cobrado' : 'Despachado (precio comerciante)'}
              </span>
              <span className="font-['Manrope'] font-extrabold text-[22px] sm:text-[26px] leading-tight text-[#16a34a]">
                {formatCOP(cerrada ? liq.montoCobrado : totalLiquidacion)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 sm:flex-none bg-[#f6f3f3] hover:bg-[#e7e5e4] text-[#1b1b1c] font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-5 py-2.5 sm:py-3 transition-colors cursor-pointer text-center"
            >
              Volver
            </button>
            {estaAbierta && comerciante && (
              <button
                onClick={irACierreDiario}
                className="flex-1 sm:flex-none bg-primary hover:bg-primary-dark text-white font-['Manrope'] font-bold text-[13px] sm:text-[14px] rounded-[10px] px-5 py-2.5 sm:py-3 transition-colors cursor-pointer shadow-sm text-center flex items-center justify-center gap-2"
              >
                Hacer Cierre Diario ✓
              </button>
            )}
          </div>
        </div>
      )}

      {prorrogaAbierta && (
        <ModalProrroga
          planilla={{ planillaId, fechaLimitePago: liq.fechaLimite, saldo: liq.saldo }}
          onClose={() => setProrrogaAbierta(false)}
          onGuardado={(fecha) => {
            setFechaLimiteNueva(fecha);
            setProrrogaAbierta(false);
            setAvisoProrroga(`Fecha límite extendida al ${formatoFecha(fecha)}.`);
          }}
        />
      )}
    </AppLayout>
  );
}
