/**
 * PlanillaDiaria.jsx — RF36 · RF37 · RF38 · RF39
 * Despacho matutino · Liquidación · Historial · Impresión
 * Todo el código en un único archivo — sin subcomponentes externos.
 *
 * Vista 'selector'  → elegir comerciante
 * Vista 'planilla'  → despacho (SIN_PLANILLA) / liquidación (ABIERTA) / resumen (CERRADA)
 * Vista 'historial' → planillas cerradas con filtro de período
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '../../components/AppLayout';
import {
  getComerciantes,
  getPlanillaActiva,
  registrarDespacho,
  liquidarPlanilla,
  getHistorialPlanillas,
  getDatosPlanillaImpresion,
  getProductosCatalogo,
} from '../../services/ventasService';

/* ──────────────────────── ESTILOS DE IMPRESIÓN ──────────────────────────── */
function PrintStyle() {
  return (
    <style>{`
      @media print {
        .no-print { display: none !important; }
        body { font-family: Arial, sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f4f4f4; font-weight: bold; }
      }
    `}</style>
  );
}

/* ──────────────────────── UTILIDADES ───────────────────────────────────── */
const formatCOP = (n) =>
  '$' + Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });

const formatFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatFechaHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const hoy = () => new Date().toISOString().slice(0, 10);

const primerDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

/* ──────────────────────── ÍCONOS SVG ───────────────────────────────────── */
function ArrowLeftIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>;
}
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function SpinIcon() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>;
}
function TruckIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function LockIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}
function PrinterIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
}
function InfoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
}
function CheckCircleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
function XIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IceCreamIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22l-4-8h8z"/><circle cx="12" cy="10" r="6"/></svg>;
}
function AlertIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function HistorialIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function ChevronIcon({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ──────────────────────── CLASES DE TABLA ──────────────────────────────── */
const thCls = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter border-b border-zinc-200 bg-zinc-50';
const tdCls = 'px-4 py-3 text-sm text-zinc-800 font-inter';

/* ═══════════════════════ COMPONENTE PRINCIPAL ══════════════════════════════ */
export default function PlanillaDiaria() {

  /* ── Navegación ── */
  const [vista, setVista] = useState('selector');

  /* ── Comerciantes ── */
  const [comerciantes, setComerciantes]         = useState([]);
  const [cargandoCom, setCargandoCom]           = useState(true);
  const [busqueda, setBusqueda]                 = useState('');
  const [comerciante, setComerciante]           = useState(null);
  const [cargandoPlanilla, setCargandoPlanilla] = useState(false);

  /* ── Planilla activa ── */
  const [planilla, setPlanilla]   = useState(null);
  const [subEstado, setSubEstado] = useState('SIN_PLANILLA');
  // subEstado: 'SIN_PLANILLA' | 'ABIERTA' | 'CERRADA'

  /* ── Despacho (sub-estado SIN_PLANILLA) ── */
  const [productos, setProductos]               = useState([]);
  const [cargandoProd, setCargandoProd]         = useState(false);
  const [cantidades, setCantidades]             = useState({});
  const [enviandoDespacho, setEnviandoDespacho] = useState(false);
  const [errorDespacho, setErrorDespacho]       = useState('');

  /* ── Liquidación (sub-estado ABIERTA) ── */
  const [itemsLiq, setItemsLiq]                 = useState([]);
  const [enviandoCierre, setEnviandoCierre]     = useState(false);
  const [errorCierre, setErrorCierre]           = useState('');
  const [showModalCierre, setShowModalCierre]   = useState(false);

  /* ── Historial ── */
  const [historial, setHistorial]               = useState([]);
  const [cargandoHist, setCargandoHist]         = useState(false);
  const [filtroDesde, setFiltroDesde]           = useState(primerDiaMes());
  const [filtroHasta, setFiltroHasta]           = useState(hoy());
  const [expandedId, setExpandedId]             = useState(null);

  /* ── Impresión ── */
  const [datosImpresion, setDatosImpresion]     = useState(null);
  const [imprimiendo, setImprimiendo]           = useState(false);

  /* ── Error global ── */
  const [errorGlobal, setErrorGlobal]           = useState('');

  /* ══ Cargar comerciantes al montar ══ */
  useEffect(() => {
    let vivo = true;
    setCargandoCom(true);
    getComerciantes()
      .then((d) => { if (vivo) setComerciantes(d); })
      .catch(() => { if (vivo) setErrorGlobal('No se pudo cargar la lista de comerciantes.'); })
      .finally(() => { if (vivo) setCargandoCom(false); });
    return () => { vivo = false; };
  }, []);

  /* ══ Cargar catálogo al entrar en sub-estado SIN_PLANILLA ══ */
  useEffect(() => {
    if (vista !== 'planilla' || subEstado !== 'SIN_PLANILLA') return;
    let vivo = true;
    setCargandoProd(true);
    setErrorDespacho('');
    getProductosCatalogo()
      .then((data) => {
        if (!vivo) return;
        // Mapeo exacto con los campos reales que devuelve el backend
        const mapped = data.map((p) => ({
          id:            p.id,
          codigoTecnico: p.codigo,
          nombre:        p.nombre,
          imagenUrl:     p.imagen ?? null,
          precioVenta:   Number(p.precioUnitario),
          stockActual:   Number(p.stock),
          disponible:    p.disponible,
        }));
        setProductos(mapped);
        setCantidades(Object.fromEntries(mapped.map((p) => [p.id, 0])));
      })
      .catch(() => { if (vivo) setErrorDespacho('No se pudo cargar el catálogo.'); })
      .finally(() => { if (vivo) setCargandoProd(false); });
    return () => { vivo = false; };
  }, [vista, subEstado]);

  /* ══ Inicializar items de liquidación al entrar en ABIERTA ══ */
  useEffect(() => {
    if (vista !== 'planilla' || subEstado !== 'ABIERTA' || !planilla) return;
    setItemsLiq(
      (planilla.items ?? []).map((it) => ({
        ...it,
        unidadesDevueltas: it.unidadesDevueltas ?? 0,
      }))
    );
  }, [vista, subEstado, planilla]);

  /* ── Seleccionar comerciante y consultar planilla activa ── */
  const seleccionarComerciante = useCallback(async (com) => {
    setComerciante(com);
    setCargandoPlanilla(true);
    setErrorGlobal('');
    setErrorDespacho('');
    setErrorCierre('');
    setDatosImpresion(null);
    try {
      const p = await getPlanillaActiva(com.id);
      setPlanilla(p);
      if (!p) {
        setSubEstado('SIN_PLANILLA');
      } else if (p.cerrada) {
        setSubEstado('CERRADA');
      } else {
        setSubEstado('ABIERTA');
      }
      setVista('planilla');
    } catch {
      setErrorGlobal('Error al consultar la planilla del comerciante.');
    } finally {
      setCargandoPlanilla(false);
    }
  }, []);

  /* ── Ver historial de un comerciante ── */
  const verHistorial = useCallback(async (com) => {
    setComerciante(com);
    setHistorial([]);
    setExpandedId(null);
    setVista('historial');
    setCargandoHist(true);
    setErrorGlobal('');
    try {
      const data = await getHistorialPlanillas(com.id, filtroDesde, filtroHasta);
      setHistorial(data);
    } catch {
      setErrorGlobal('Error al cargar el historial.');
    } finally {
      setCargandoHist(false);
    }
  }, [filtroDesde, filtroHasta]);

  /* ── Filtrar historial ── */
  const filtrarHistorial = async () => {
    if (!comerciante) return;
    setCargandoHist(true);
    setErrorGlobal('');
    try {
      const data = await getHistorialPlanillas(comerciante.id, filtroDesde, filtroHasta);
      setHistorial(data);
    } catch {
      setErrorGlobal('Error al filtrar el historial.');
    } finally {
      setCargandoHist(false);
    }
  };

  /* ── Registrar Despacho ── */
  const handleDespacho = async () => {
    setEnviandoDespacho(true);
    setErrorDespacho('');
    try {
      const items = productos
        .filter((p) => (cantidades[p.id] ?? 0) > 0)
        .map((p) => ({
          productoId:     p.id,
          cantidad:       cantidades[p.id],
          precioUnitario: p.precioVenta,
        }));
      const resp = await registrarDespacho({
        comercianteId: comerciante.id,
        fecha:         hoy(),
        items,
      });
      setPlanilla(resp);
      setSubEstado('ABIERTA');
    } catch (err) {
      const status = err?.response?.status;
      const data   = err?.response?.data;
      if (status === 409) {
        setErrorDespacho(data?.mensaje ?? 'Stock insuficiente para uno o más productos.');
      } else {
        setErrorDespacho(data?.mensaje ?? 'Error al registrar el despacho.');
      }
    } finally {
      setEnviandoDespacho(false);
    }
  };

  /* ── Cerrar Planilla ── */
  const handleCierre = async () => {
    setShowModalCierre(false);
    setEnviandoCierre(true);
    setErrorCierre('');
    try {
      const items = itemsLiq.map((it) => ({
        productoId:        it.productoId,
        unidadesDevueltas: it.unidadesDevueltas ?? 0,
      }));
      const resp = await liquidarPlanilla(planilla.id, items);
      setPlanilla(resp);
      setSubEstado('CERRADA');
    } catch (err) {
      setErrorCierre(err?.response?.data?.mensaje ?? 'Error al cerrar la planilla.');
    } finally {
      setEnviandoCierre(false);
    }
  };

  /* ── Imprimir planilla ── */
  const handleImprimir = async (planillaId) => {
    setImprimiendo(true);
    try {
      const datos = await getDatosPlanillaImpresion(planillaId);
      setDatosImpresion(datos);
      setTimeout(() => { window.print(); setImprimiendo(false); }, 150);
    } catch {
      // Fallback: imprimir con los datos actuales en memoria
      window.print();
      setImprimiendo(false);
    }
  };

  /* ── Volver al selector (limpia estado de planilla) ── */
  const volverAlSelector = () => {
    setVista('selector');
    setErrorGlobal('');
    setErrorDespacho('');
    setErrorCierre('');
    setProductos([]);
    setCantidades({});
    setItemsLiq([]);
    setDatosImpresion(null);
  };

  /* ── Cálculos locales de liquidación (tiempo real, sin llamadas al backend) ── */
  const calcLiq = useMemo(() => {
    const items = itemsLiq.map((it) => {
      const devueltas = Math.min(it.unidadesDevueltas ?? 0, it.unidadesDespachadas ?? 0);
      const vendidas  = (it.unidadesDespachadas ?? 0) - devueltas;
      const ganancia  = vendidas * Number(it.precioVenta ?? 0);
      return { ...it, vendidas, gananciaLocal: ganancia };
    });
    const totalDespachadas = items.reduce((a, i) => a + (i.unidadesDespachadas ?? 0), 0);
    const totalDevueltas   = items.reduce((a, i) => a + (i.unidadesDevueltas ?? 0), 0);
    const totalVendidas    = items.reduce((a, i) => a + i.vendidas, 0);
    const totalGanancia    = items.reduce((a, i) => a + i.gananciaLocal, 0);
    const hayError         = itemsLiq.some((it) => (it.unidadesDevueltas ?? 0) > (it.unidadesDespachadas ?? 0));
    return { items, totalDespachadas, totalDevueltas, totalVendidas, totalGanancia, hayError };
  }, [itemsLiq]);

  /* ── Comerciantes filtrados localmente ── */
  const comerciantesFiltrados = useMemo(() => {
    const activos = comerciantes.filter((c) => c.activo !== false);
    if (!busqueda.trim()) return activos;
    const q = busqueda.toLowerCase();
    return activos.filter(
      (c) => c.nombre?.toLowerCase().includes(q) || c.telefono?.includes(q)
    );
  }, [comerciantes, busqueda]);

  /* ── ¿Hay al menos un producto con cantidad > 0 para despachar? ── */
  const hayItemsDespacho = useMemo(
    () => Object.values(cantidades).some((v) => v > 0),
    [cantidades]
  );

  /* ── Datos a usar al imprimir (priorizando respuesta del endpoint /imprimir) ── */
  const datosParaImprimir = datosImpresion ?? planilla;

  /* ════════════════════════════ RENDER ════════════════════════════════════ */
  return (
    <AppLayout>
      <PrintStyle />

      {/* ── Área solo visible al imprimir ── */}
      <div className="hidden print:block p-4">
        {datosParaImprimir && (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
              Planilla Diaria — {comerciante?.nombre ?? datosParaImprimir.comercianteNombre ?? ''}
            </h1>
            <p style={{ fontSize: 12, marginBottom: 2 }}>
              Fecha: {formatFecha(datosParaImprimir.fecha)}
            </p>
            {datosParaImprimir.timestampCierre && (
              <p style={{ fontSize: 12, marginBottom: 12 }}>
                Cerrada: {formatFechaHora(datosParaImprimir.timestampCierre)}
              </p>
            )}
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Despachadas</th>
                  <th>Devueltas</th>
                  <th>Vendidas</th>
                  <th>Precio Venta</th>
                  <th>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {(datosParaImprimir.items ?? []).map((it, i) => {
                  const vendidas = (it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0);
                  return (
                    <tr key={i}>
                      <td>{it.nombre ?? it.productoNombre ?? '—'}</td>
                      <td>{it.unidadesDespachadas}</td>
                      <td>{it.unidadesDevueltas}</td>
                      <td>{vendidas}</td>
                      <td>{formatCOP(it.precioVenta)}</td>
                      <td>{formatCOP(it.ganancia ?? vendidas * Number(it.precioVenta ?? 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ fontWeight: 'bold', textAlign: 'right' }}>TOTAL GANANCIA</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCOP(datosParaImprimir.totalGanancia)}</td>
                </tr>
              </tfoot>
            </table>
            <p style={{ marginTop: 20, fontSize: 11, color: '#888' }}>
              Generado por GELOX — {new Date().toLocaleString('es-CO')}
            </p>
          </>
        )}
      </div>

      {/* ════════════════ CONTENIDO PRINCIPAL (oculto al imprimir) ════════════════ */}
      <div className="max-w-7xl mx-auto print:hidden">

        {/* Error global */}
        {errorGlobal && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-scale-in">
            <span className="text-red-500 shrink-0 mt-0.5"><AlertIcon /></span>
            <p className="text-sm text-red-700 font-inter flex-1">{errorGlobal}</p>
            <button onClick={() => setErrorGlobal('')} className="text-red-300 hover:text-red-500 p-1">
              <XIcon size={14} />
            </button>
          </div>
        )}

        {/* ════════════ VISTA 1 — SELECTOR DE COMERCIANTE ════════════ */}
        {vista === 'selector' && (
          <div className="space-y-6 animate-fade-in-up">

            <div>
              <h1 className="font-extrabold text-3xl text-zinc-900 font-display">Planilla Diaria</h1>
              <p className="text-zinc-500 text-sm mt-1 font-inter">
                Selecciona un comerciante para gestionar su planilla del día.
              </p>
            </div>

            {/* Buscador */}
            <div className="relative max-w-sm">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Buscar comerciante..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 pl-10 text-sm font-inter outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 transition-all text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Lista */}
            {cargandoCom ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <SpinIcon /><span className="text-sm text-zinc-500 font-inter">Cargando comerciantes…</span>
              </div>
            ) : comerciantesFiltrados.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 text-sm font-inter">
                {comerciantes.length === 0 ? 'No hay comerciantes registrados.' : 'Sin resultados.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {comerciantesFiltrados.map((com) => (
                  <div
                    key={com.id}
                    onClick={() => seleccionarComerciante(com)}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">

                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                        {com.fotoUrl
                          ? <img src={com.fotoUrl} alt={com.nombre} className="w-full h-full object-cover" />
                          : <span className="text-2xl font-extrabold text-zinc-300 font-display select-none">
                              {com.nombre?.charAt(0)?.toUpperCase()}
                            </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 font-display truncate">{com.nombre}</p>
                        <p className="text-sm text-zinc-500 font-inter mt-0.5 truncate">{com.telefono}</p>
                        <span className="inline-block mt-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-inter uppercase tracking-wide">
                          Activo
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); verHistorial(com); }}
                        className="border border-zinc-300 text-zinc-600 text-xs px-3 py-1 rounded-lg hover:bg-zinc-50 transition-all font-inter flex items-center gap-1.5">
                        <HistorialIcon /> Ver Historial
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Overlay de carga al consultar planilla */}
            {cargandoPlanilla && (
              <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-xl border border-zinc-200">
                  <SpinIcon /><span className="text-sm font-inter text-zinc-700">Consultando planilla…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ VISTA 2 — PLANILLA ACTIVA ════════════ */}
        {vista === 'planilla' && comerciante && (
          <div className="space-y-5 animate-fade-in-up">

            {/* Encabezado */}
            <div className="flex items-start gap-4 flex-wrap">
              <button
                onClick={volverAlSelector}
                className="flex items-center gap-1.5 text-red-700 text-sm font-semibold font-inter hover:text-red-900 transition-colors mt-1 shrink-0">
                <ArrowLeftIcon /> Volver
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-extrabold text-2xl text-zinc-900 font-display">{comerciante.nombre}</h2>
                  {planilla?.cerrada && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full font-inter uppercase tracking-wide">
                      CERRADA
                    </span>
                  )}
                  {planilla && !planilla.cerrada && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full font-inter uppercase tracking-wide">
                      EN CURSO
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm font-inter mt-0.5">
                  {formatFecha(hoy())}
                  {planilla?.cerrada && planilla?.timestampCierre && (
                    <span className="ml-2">· Cerrada el {formatFechaHora(planilla.timestampCierre)}</span>
                  )}
                </p>
              </div>
            </div>

            {/* ── SIN PLANILLA → Formulario de despacho ── */}
            {subEstado === 'SIN_PLANILLA' && (
              <div className="space-y-4">

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700 font-inter">
                    Despacho Matutino
                  </p>
                </div>

                {errorDespacho && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-red-500 shrink-0 mt-0.5"><AlertIcon /></span>
                    <p className="text-sm text-red-700 font-inter flex-1">{errorDespacho}</p>
                  </div>
                )}

                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                  {cargandoProd ? (
                    <div className="flex items-center justify-center py-16 gap-3">
                      <SpinIcon /><span className="text-sm text-zinc-500 font-inter">Cargando productos…</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px]">
                        <thead>
                          <tr>
                            <th className={thCls}>Producto</th>
                            <th className={thCls}>Código</th>
                            <th className={thCls}>Precio Venta</th>
                            <th className={thCls + ' text-center'}>Cantidad a Despachar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productos.map((p, idx) => {
                            const sinStock = !p.disponible || p.stockActual === 0;
                            return (
                              <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                                <td className={tdCls}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-red-500 shrink-0"><IceCreamIcon /></span>
                                    <span className="font-semibold text-zinc-900">{p.nombre}</span>
                                  </div>
                                </td>
                                <td className={tdCls + ' text-zinc-400 text-xs'}>{p.codigoTecnico}</td>
                                <td className={tdCls + ' font-semibold text-zinc-800'}>{formatCOP(p.precioVenta)}</td>
                                <td className={tdCls + ' text-center'}>
                                  {sinStock ? (
                                    <span className="inline-block bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full font-inter uppercase">
                                      Sin Stock
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      max={p.stockActual}
                                      value={cantidades[p.id] ?? 0}
                                      onChange={(e) =>
                                        setCantidades((prev) => ({
                                          ...prev,
                                          [p.id]: Math.max(0, Math.min(p.stockActual, Number(e.target.value) || 0)),
                                        }))
                                      }
                                      className="w-20 border border-zinc-200 rounded-lg text-center py-1.5 text-sm font-inter outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 transition-all mx-auto block"
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleDespacho}
                    disabled={enviandoDespacho || !hayItemsDespacho || cargandoProd}
                    className="bg-red-700 hover:bg-red-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-red-700/20">
                    {enviandoDespacho
                      ? <><SpinIcon /> Registrando…</>
                      : <><TruckIcon /> Registrar Despacho</>}
                  </button>
                </div>
              </div>
            )}

            {/* ── ABIERTA → Formulario de liquidación ── */}
            {subEstado === 'ABIERTA' && (
              <div className="space-y-5">

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-blue-600 shrink-0 mt-0.5"><InfoIcon /></span>
                  <p className="text-sm text-blue-800 font-inter">
                    <span className="font-bold">Planilla en curso</span> — registra las devoluciones
                    del comerciante al finalizar la jornada.
                  </p>
                </div>

                {errorCierre && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-red-500 shrink-0 mt-0.5"><AlertIcon /></span>
                    <p className="text-sm text-red-700 font-inter flex-1">{errorCierre}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                  {/* Tabla liquidación */}
                  <div className="xl:col-span-2 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr>
                            <th className={thCls}>Producto</th>
                            <th className={thCls + ' text-center'}>Despachadas</th>
                            <th className={thCls + ' text-center'}>Devueltas</th>
                            <th className={thCls + ' text-center'}>Vendidas</th>
                            <th className={thCls + ' text-right'}>Ganancia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calcLiq.items.map((it, idx) => {
                            const errFila = (it.unidadesDevueltas ?? 0) > (it.unidadesDespachadas ?? 0);
                            return (
                              <tr key={it.productoId ?? idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                                <td className={tdCls + ' font-semibold text-zinc-900'}>{it.nombre}</td>
                                <td className={tdCls + ' text-center font-semibold'}>{it.unidadesDespachadas}</td>
                                <td className={tdCls + ' text-center'}>
                                  <div>
                                    <input
                                      type="number"
                                      min="0"
                                      value={it.unidadesDevueltas ?? 0}
                                      onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value) || 0);
                                        setItemsLiq((prev) =>
                                          prev.map((i) =>
                                            i.productoId === it.productoId
                                              ? { ...i, unidadesDevueltas: val }
                                              : i
                                          )
                                        );
                                      }}
                                      className={`w-20 border rounded-lg text-center py-1.5 text-sm font-inter outline-none transition-all mx-auto block ${
                                        errFila
                                          ? 'border-red-400 ring-1 ring-red-300 bg-red-50'
                                          : 'border-zinc-200 focus:border-red-400 focus:ring-1 focus:ring-red-200'
                                      }`}
                                    />
                                    {errFila && (
                                      <p className="text-[10px] text-red-500 font-inter mt-0.5 text-center">
                                        Máx. {it.unidadesDespachadas}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className={tdCls + ' text-center font-semibold text-emerald-600'}>
                                  {it.vendidas}
                                </td>
                                <td className={tdCls + ' text-right font-bold text-emerald-700'}>
                                  {formatCOP(it.gananciaLocal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                            <td className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter">
                              Totales
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-zinc-900">
                              {calcLiq.totalDespachadas}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-zinc-900">
                              {calcLiq.totalDevueltas}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">
                              {calcLiq.totalVendidas}
                            </td>
                            <td className="px-4 py-3 text-right text-lg font-extrabold text-emerald-700">
                              {formatCOP(calcLiq.totalGanancia)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Card resumen */}
                  <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4 h-fit">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter">
                      Resumen de Jornada
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm font-inter">
                        <span className="text-zinc-500">Despachadas</span>
                        <span className="font-semibold text-zinc-900">{calcLiq.totalDespachadas}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-inter">
                        <span className="text-zinc-500">Devueltas</span>
                        <span className="font-semibold text-zinc-900">{calcLiq.totalDevueltas}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                        <span className="text-sm font-semibold text-zinc-700 font-inter">Vendidas</span>
                        <span className="text-xl font-bold text-emerald-600 font-display">
                          {calcLiq.totalVendidas}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <span className="text-sm font-bold text-emerald-800 font-display">Ganancia Total</span>
                        <span className="text-2xl font-extrabold text-emerald-700 font-display">
                          {formatCOP(calcLiq.totalGanancia)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowModalCierre(true)}
                      disabled={enviandoCierre || calcLiq.hayError || itemsLiq.length === 0}
                      className="w-full bg-red-700 hover:bg-red-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-red-700/20 mt-2">
                      {enviandoCierre
                        ? <><SpinIcon /> Cerrando…</>
                        : <><LockIcon /> Cerrar Planilla</>}
                    </button>
                    {calcLiq.hayError && (
                      <p className="text-[11px] text-red-500 font-inter text-center">
                        Corrige los valores de devolución antes de cerrar.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── CERRADA → Resumen final ── */}
            {subEstado === 'CERRADA' && planilla && (
              <div className="space-y-5">

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-emerald-600 shrink-0 mt-0.5"><CheckCircleIcon /></span>
                  <p className="text-sm text-emerald-800 font-inter">
                    <span className="font-bold">Planilla cerrada</span>
                    {planilla.timestampCierre && ` el ${formatFechaHora(planilla.timestampCierre)}`}
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                  {/* Tabla solo lectura */}
                  <div className="xl:col-span-2 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead>
                          <tr>
                            <th className={thCls}>Producto</th>
                            <th className={thCls + ' text-center'}>Despachadas</th>
                            <th className={thCls + ' text-center'}>Devueltas</th>
                            <th className={thCls + ' text-center'}>Vendidas</th>
                            <th className={thCls + ' text-right'}>Precio</th>
                            <th className={thCls + ' text-right'}>Ganancia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(planilla.items ?? []).map((it, idx) => {
                            const vendidas = (it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0);
                            return (
                              <tr key={it.productoId ?? idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                                <td className={tdCls + ' font-semibold text-zinc-900'}>{it.nombre}</td>
                                <td className={tdCls + ' text-center'}>{it.unidadesDespachadas}</td>
                                <td className={tdCls + ' text-center'}>{it.unidadesDevueltas}</td>
                                <td className={tdCls + ' text-center font-semibold text-emerald-600'}>{vendidas}</td>
                                <td className={tdCls + ' text-right'}>{formatCOP(it.precioVenta)}</td>
                                <td className={tdCls + ' text-right font-bold text-emerald-700'}>{formatCOP(it.ganancia)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Card resumen estático */}
                  <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 space-y-4 h-fit">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter">
                      Resumen Final
                    </p>
                    <div className="space-y-3">
                      {planilla.efectivoRecibido != null && (
                        <div className="flex justify-between items-center text-sm font-inter">
                          <span className="text-zinc-500">Efectivo recibido</span>
                          <span className="font-semibold text-zinc-900">{formatCOP(planilla.efectivoRecibido)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <span className="text-sm font-bold text-emerald-800 font-display">Ganancia Total</span>
                        <span className="text-2xl font-extrabold text-emerald-700 font-display">
                          {formatCOP(planilla.totalGanancia)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImprimir(planilla.id)}
                      disabled={imprimiendo}
                      className="w-full border-2 border-red-700 text-red-700 font-bold px-6 py-2.5 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60">
                      {imprimiendo ? <SpinIcon /> : <PrinterIcon />}
                      Imprimir Planilla
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ VISTA 3 — HISTORIAL ════════════ */}
        {vista === 'historial' && comerciante && (
          <div className="space-y-5 animate-fade-in-up">

            {/* Encabezado */}
            <div className="flex items-start gap-4 flex-wrap">
              <button
                onClick={volverAlSelector}
                className="flex items-center gap-1.5 text-red-700 text-sm font-semibold font-inter hover:text-red-900 transition-colors mt-1 shrink-0">
                <ArrowLeftIcon /> Volver
              </button>
              <div>
                <h2 className="font-extrabold text-2xl text-zinc-900 font-display">
                  Historial de Planillas — {comerciante.nombre}
                </h2>
                <p className="text-zinc-500 text-sm font-inter mt-0.5">
                  Planillas cerradas del período seleccionado.
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter mb-1.5">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filtroDesde}
                    onChange={(e) => setFiltroDesde(e.target.value)}
                    className="border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-inter outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 transition-all text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-inter mb-1.5">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filtroHasta}
                    onChange={(e) => setFiltroHasta(e.target.value)}
                    className="border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-inter outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 transition-all text-zinc-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={filtrarHistorial}
                  disabled={cargandoHist}
                  className="bg-red-700 hover:bg-red-800 disabled:bg-zinc-300 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-[0.98] flex items-center gap-2">
                  {cargandoHist && <SpinIcon />}
                  Filtrar
                </button>
              </div>
            </div>

            {/* Lista de planillas cerradas */}
            {cargandoHist ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <SpinIcon /><span className="text-sm text-zinc-500 font-inter">Cargando historial…</span>
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm font-inter">
                No hay planillas en este período.
              </div>
            ) : (
              <div className="space-y-3">
                {historial.map((h) => {
                  const expanded = expandedId === h.id;
                  return (
                    <div key={h.id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="font-bold text-zinc-900 font-display">{formatFecha(h.fecha)}</p>
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-inter uppercase tracking-wide">
                                CERRADA
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-inter mt-1">
                              {h.timestampCierre ? formatFechaHora(h.timestampCierre) : '—'}
                            </p>
                            <p className="text-sm text-zinc-600 font-inter mt-2">
                              {h.items?.length ?? 0} producto{(h.items?.length ?? 0) !== 1 ? 's' : ''}
                              {h.totalGanancia != null && ` · Ganancia: ${formatCOP(h.totalGanancia)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleImprimir(h.id)}
                              disabled={imprimiendo}
                              className="border border-zinc-300 text-zinc-600 text-xs px-3 py-1 rounded-lg hover:bg-zinc-50 transition-all font-inter flex items-center gap-1.5 disabled:opacity-50">
                              <PrinterIcon /> Imprimir
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : h.id)}
                              className="text-red-700 text-sm font-semibold font-inter hover:underline flex items-center gap-1 transition-all">
                              {expanded ? 'Ocultar' : 'Ver detalle'}
                              <ChevronIcon open={expanded} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Detalle expandible */}
                      {expanded && (
                        <div className="border-t border-zinc-100">
                          {!h.items?.length ? (
                            <p className="px-5 py-4 text-sm text-zinc-400 font-inter">Sin ítems registrados.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[520px]">
                                <thead>
                                  <tr>
                                    <th className={thCls}>Producto</th>
                                    <th className={thCls + ' text-center'}>Despachadas</th>
                                    <th className={thCls + ' text-center'}>Devueltas</th>
                                    <th className={thCls + ' text-center'}>Vendidas</th>
                                    <th className={thCls + ' text-right'}>Ganancia</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {h.items.map((it, idx) => {
                                    const vendidas = (it.unidadesDespachadas ?? 0) - (it.unidadesDevueltas ?? 0);
                                    return (
                                      <tr key={it.productoId ?? idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60'}>
                                        <td className={tdCls + ' font-semibold text-zinc-900'}>{it.nombre}</td>
                                        <td className={tdCls + ' text-center'}>{it.unidadesDespachadas}</td>
                                        <td className={tdCls + ' text-center'}>{it.unidadesDevueltas}</td>
                                        <td className={tdCls + ' text-center font-semibold text-emerald-600'}>{vendidas}</td>
                                        <td className={tdCls + ' text-right font-bold text-emerald-700'}>{formatCOP(it.ganancia)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════ MODAL CONFIRMAR CIERRE ════════════ */}
      {showModalCierre && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm flex flex-col max-h-[90vh]">

            <div className="px-6 py-5 border-b border-zinc-100 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
                <LockIcon /> Cerrar Planilla
              </h3>
              <button onClick={() => setShowModalCierre(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-all">
                <XIcon size={15} />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-4">
              <p className="text-sm text-zinc-600 font-inter">
                ¿Confirmar el cierre de la planilla de{' '}
                <span className="font-bold text-zinc-900">{comerciante?.nombre}</span>?
                Esta acción es{' '}
                <span className="font-bold text-red-700">irreversible</span>.
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-emerald-800 font-display">Ganancia estimada</span>
                <span className="text-xl font-extrabold text-emerald-700 font-display">
                  {formatCOP(calcLiq.totalGanancia)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-zinc-100 shrink-0">
              <button
                onClick={() => setShowModalCierre(false)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl py-3 text-sm font-semibold transition-all font-inter">
                Cancelar
              </button>
              <button
                onClick={handleCierre}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-red-700/20 font-display flex items-center justify-center gap-2">
                <LockIcon /> Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
