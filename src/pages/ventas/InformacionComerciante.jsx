// src/pages/ventas/InformacionComerciante.jsx — RF38
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from 'recharts';
import AppLayout from '../../components/AppLayout';
import CustomSelect from '../../components/ui/CustomSelect';
import { getPlanillasComerciante, actualizarComerciante, cambiarEstadoComerciante } from '../../services/ventasService';

const MUNICIPIOS      = ['Ocaña', 'Cúcuta', 'Villa del Rosario', 'Los Patios', 'El Zulia', 'Tibú', 'Otro'];
const TALLAS          = ['S', 'M', 'L', 'XL'];
const TIPOS_DOCUMENTO = ['CC', 'PPT'];
const MESES       = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DIAS_CORTOS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const POR_PAGINA  = 7;

function parseFecha(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatCOP(val) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(val ?? 0);
}

function buildChartData(planillas) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const p = planillas.find(pl => pl.fecha === iso);
    return { dia: DIAS_CORTOS[d.getDay()], valor: p ? (p.ganancia ?? 0) : 0 };
  });
}

function calcRendimiento(data) {
  const vals = data.map(d => d.valor);
  const prev = vals.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
  const rec  = vals.slice(4).reduce((a, b) => a + b, 0) / 3;
  if (prev === 0 && rec === 0) return 0;
  if (prev === 0) return 100;
  return ((rec - prev) / prev) * 100;
}

export default function InformacionComerciante() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const comerciante  = location.state?.comerciante;

  const [comercianteLocal, setComerianteLocal] = useState(comerciante);

  const [planillas,      setPlanillas]      = useState([]);
  const [cargando,       setCargando]       = useState(true);
  const [error,          setError]          = useState('');
  const [fechaInicio,    setFechaInicio]    = useState('');
  const [fechaFin,       setFechaFin]       = useState('');
  const [filtroActivo,   setFiltroActivo]   = useState({ inicio: '', fin: '' });
  const [pagina,         setPagina]         = useState(1);
  const [fechaElegida,   setFechaElegida]   = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [errorFecha,     setErrorFecha]     = useState('');

  const [modalEditar,    setModalEditar]    = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [formEditar,     setFormEditar]     = useState({});
  const [fotoPreview,    setFotoPreview]    = useState(null);
  const [guardando,      setGuardando]      = useState(false);
  const [errorEditar,    setErrorEditar]    = useState('');

  const inputFileEditRef = useRef();

  const cargar = useCallback(async (inicio, fin) => {
    setCargando(true);
    setError('');
    try {
      const data = await getPlanillasComerciante(
        id,
        inicio || undefined,
        fin   || undefined,
      );
      setPlanillas(Array.isArray(data) ? data : []);
    } catch {
      setError('No se pudo cargar el historial de planillas.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar(filtroActivo.inicio, filtroActivo.fin);
    setPagina(1);
  }, [cargar, filtroActivo]);

  function aplicarFiltro() {
    setPagina(1);
    setFiltroActivo({ inicio: fechaInicio, fin: fechaFin });
  }

  const [busquedaPlanilla, setBusquedaPlanilla] = useState('');

  const chartData      = buildChartData(planillas);
  const rendimiento    = calcRendimiento(chartData);
  const alAlza         = rendimiento >= 0;
  const planillasFiltradas = busquedaPlanilla.trim()
    ? planillas.filter(pl => pl.fecha?.includes(busquedaPlanilla.trim()))
    : planillas;
  const totalPaginas   = Math.max(1, Math.ceil(planillasFiltradas.length / POR_PAGINA));
  const planillasPagina = planillasFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  function abrirModalEditar() {
    const c = comercianteLocal;
    setFormEditar({
      nombre:                       c.nombre ?? '',
      municipio:                    c.municipio ?? 'Ocaña',
      direccion:                    c.direccion ?? '',
      telefono:                     c.telefono ?? '',
      placa:                        c.placa ?? '',
      documento:                    c.documento ?? '',
      tipoDocumento:                c.tipoDocumento ?? 'CC',
      eps:                          c.eps ?? '',
      contactoEmergenciaNombre:     c.contactoEmergenciaNombre   ?? c.contacto_emergencia_nombre   ?? '',
      contactoEmergenciaParentesco: c.contactoEmergenciaParentesco ?? c.contacto_emergencia_parentesco ?? '',
      tallaUniforme:                c.tallaUniforme ?? c.talla_uniforme ?? 'M',
      activo:                       c.activo ?? true,
      foto:                         null,
    });
    setFotoPreview(null);
    setErrorEditar('');
    setModalEditar(true);
  }

  function handleCloseModal() {
    if (isClosingModal || guardando) return;
    setIsClosingModal(true);
    setTimeout(() => {
      setIsClosingModal(false);
      setModalEditar(false);
    }, 200);
  }

  async function submitEditar(e) {
    e.preventDefault();
    if (!formEditar.nombre?.trim()) {
      setErrorEditar('El nombre es requerido.');
      return;
    }
    setGuardando(true);
    setErrorEditar('');
    try {
      const fd = new FormData();
      fd.append('nombre', formEditar.nombre.trim());
      if (formEditar.municipio)                    fd.append('municipio', formEditar.municipio);
      if (formEditar.direccion)                    fd.append('direccion', formEditar.direccion);
      if (formEditar.telefono)                     fd.append('telefono', formEditar.telefono);
      fd.append('placa', formEditar.placa ?? '');
      if (formEditar.documento)                    fd.append('documento', formEditar.documento);
      if (formEditar.tipoDocumento)                fd.append('tipoDocumento', formEditar.tipoDocumento);
      if (formEditar.eps)                          fd.append('eps', formEditar.eps);
      if (formEditar.contactoEmergenciaNombre)     fd.append('contactoEmergenciaNombre', formEditar.contactoEmergenciaNombre);
      if (formEditar.contactoEmergenciaParentesco) fd.append('contactoEmergenciaParentesco', formEditar.contactoEmergenciaParentesco);
      if (formEditar.tallaUniforme)                fd.append('tallaUniforme', formEditar.tallaUniforme);
      if (formEditar.foto)                         fd.append('foto', formEditar.foto);

      let actualizado = await actualizarComerciante(id, fd);

      if (formEditar.activo !== comercianteLocal.activo) {
        actualizado = await cambiarEstadoComerciante(id, formEditar.activo);
      }

      setComerianteLocal(prev => ({ ...prev, ...actualizado }));
      handleCloseModal();
    } catch {
      setErrorEditar('No se pudo guardar los cambios. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  // ── Guardia: sin datos de navegación ──────────────────────────────────────
  if (!comerciante) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-['Inter'] text-[15px] text-[#78716c]">Información no disponible.</p>
          <button
            onClick={() => navigate('/ventas/comerciantes')}
            className="bg-[#9e2016] hover:bg-[#c0392b] text-white font-['Manrope'] font-bold px-5 py-2.5 rounded-[10px] transition-colors cursor-pointer"
          >
            Volver a Mis Comerciantes
          </button>
        </div>
      </AppLayout>
    );
  }

  const iniciales = comercianteLocal.nombre
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const emergNombre   = comercianteLocal.contactoEmergenciaNombre   ?? comercianteLocal.contacto_emergencia_nombre   ?? '';
  const emergRelacion = comercianteLocal.contactoEmergenciaParentesco ?? comercianteLocal.contacto_emergencia_parentesco ?? '';
  const emergTelefono = comercianteLocal.contactoEmergenciaTelefono  ?? comercianteLocal.contacto_emergencia_telefono  ?? '';

  const inputClass = "bg-[#f6f3f3] border-none rounded-[10px] px-4 py-3.5 font-['Inter'] text-[16px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 w-full placeholder-[rgba(168,162,158,0.8)]";
  const labelClass = "font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-2 block";

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 animate-fade-in-up">

        {/* ── Breadcrumb ── */}
        <button
          onClick={() => navigate('/ventas/comerciantes')}
          className="flex items-center gap-1.5 text-[#78716c] hover:text-[#1b1b1c] transition-colors w-fit font-['Inter'] text-[13px] cursor-pointer"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver a Mis Comerciantes
        </button>

        {/* ══ TARJETA DE PERFIL — ancho completo ══════════════════════════════ */}
        <div className="bg-white rounded-[16px] border border-[#f5f5f4] px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex gap-4 sm:gap-5 items-start">

            {/* Foto */}
            <div className="relative shrink-0">
              {comercianteLocal.fotoUrl ? (
                <img
                  src={comercianteLocal.fotoUrl}
                  alt={comercianteLocal.nombre}
                  className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-[10px] object-cover"
                />
              ) : (
                <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-[10px] bg-[#f6f3f3] flex items-center justify-center">
                  <span className="font-['Manrope'] font-bold text-[20px] sm:text-[26px] text-[#9e2016]">{iniciales}</span>
                </div>
              )}
              {comercianteLocal.activo && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#16a34a] rounded-full border-2 border-white" />
              )}
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0">
              {/* Nombre + botón */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="font-['Manrope'] font-extrabold text-[18px] sm:text-[24px] text-[#1b1b1c] leading-tight truncate">
                    {comercianteLocal.nombre}
                  </h1>
                  <button
                    onClick={abrirModalEditar}
                    title="Editar comerciante"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#a8a29e] hover:text-[#9e2016] hover:bg-[#f6f3f3] transition-all duration-200 cursor-pointer"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                      <path d="M9.5 2l2.5 2.5-7 7H2.5V9L9.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 3.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => navigate(`/ventas/comerciantes/${id}/planilla-hoy`, { state: { comerciante: comercianteLocal } })}
                  className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-[#9e2016] hover:bg-[#c0392b] text-white font-['Manrope'] font-bold text-[12px] sm:text-[13px] rounded-[8px] px-3 sm:px-4 py-2 sm:py-2.5 transition-colors cursor-pointer shadow-sm"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                    <path d="M3 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l2.414 2.414A1 1 0 0 1 12 4.414V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2z"
                      stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 1v3h3M5 7h4M5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">Planilla Hoy</span>
                </button>
              </div>

              {/* Datos en grid — 1 col mobile, 2 col desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 mt-2.5">
                <DataItem icon="map" label={`Municipio de ${comercianteLocal.municipio}`} />
                {comercianteLocal.direccion
                  ? <DataItem icon="pin" label={comercianteLocal.direccion} />
                  : <span />}
                {comercianteLocal.telefono
                  ? <DataItem icon="phone" label={comercianteLocal.telefono} />
                  : <span />}
                {(comercianteLocal.tallaUniforme ?? comercianteLocal.talla_uniforme)
                  ? <DataItem icon="person" label={`Talla de Uniforme: ${comercianteLocal.tallaUniforme ?? comercianteLocal.talla_uniforme}`} />
                  : <span />}
                {comercianteLocal.placa
                  ? <DataItem icon="pin" label={`Placa del Carrito: ${comercianteLocal.placa}`} />
                  : <span />}
                {comercianteLocal.documento
                  ? <DataItem icon="doc" label={`Documento: ${comercianteLocal.tipoDocumento ? `(${comercianteLocal.tipoDocumento}) ` : ''}${comercianteLocal.documento}`} />
                  : <span />}
                {comercianteLocal.eps
                  ? <DataItem icon="health" label={`EPS: ${comercianteLocal.eps}`} />
                  : <span />}
              </div>

              {/* Contacto de emergencia */}
              {emergNombre && (
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-[#f5f5f4] flex-wrap">
                  <svg width="13" height="13" fill="none" viewBox="0 0 13 13" className="text-[#9e2016] shrink-0 mt-0.5">
                    <path d="M6.5 1v11M1 6.5h11M2.4 2.4l8.2 8.2M10.6 2.4L2.4 10.6"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.6px] text-[#a8a29e] shrink-0 mt-0.5">
                    Contacto de Emergencia
                  </span>
                  <span className="font-['Inter'] text-[13px] text-[#1b1b1c] min-w-0">
                    {emergNombre}
                    {emergRelacion && <span className="text-[#78716c]"> ({emergRelacion})</span>}
                    {emergTelefono && <span className="text-[#78716c]"> — {emergTelefono}</span>}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ DOS COLUMNAS ════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row gap-5 items-start">

          {/* ── COLUMNA IZQUIERDA ~35% ── */}
          <div className="w-full md:w-[320px] md:shrink-0 flex flex-col gap-4">

            {/* Rendimiento 7D */}
            <div className="bg-white rounded-[16px] border border-[#f5f5f4] p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.7px] text-[#a8a29e]">
                  Rendimiento 7D
                </span>
                <span className={`font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] px-2.5 py-1 rounded-full ${
                  alAlza ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'
                }`}>
                  {alAlza ? 'AL ALZA' : 'A LA BAJA'}
                </span>
              </div>
              <p className="font-['Manrope'] font-extrabold text-[32px] leading-[40px] text-[#1b1b1c] mt-1">
                {alAlza && rendimiento !== 0 ? '+' : ''}{rendimiento.toFixed(1)}%
              </p>
              <div className="mt-2">
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={chartData} barSize={14} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis
                      dataKey="dia"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#a8a29e', fontFamily: 'Inter' }}
                    />
                    <Bar dataKey="valor" radius={[3, 3, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i >= chartData.length - 2 ? '#9e2016' : '#e7e5e4'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Elegir Planilla */}
            <div className="bg-white rounded-[16px] border border-[#f5f5f4] p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#78716c]">
                  <rect x="2" y="2.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 1.5v2M9 1.5v2M2 5.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c]">Elegir Planilla</span>
              </div>
              <label className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e] block mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={fechaElegida}
                onChange={e => { setFechaElegida(e.target.value); setErrorFecha(''); }}
                className="w-full bg-[#f6f3f3] border-none rounded-[10px] px-4 py-3 font-['Inter'] text-[14px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20 mb-3"
              />
              {errorFecha && (
                <p className="font-['Inter'] text-[12px] text-[#dc2626] mb-2">{errorFecha}</p>
              )}
              <button
                onClick={() => {
                  const encontrada = planillas.find(pl => pl.fecha === fechaElegida);
                  if (encontrada) {
                    navigate(`/ventas/planilla/${encontrada.planillaId}`, {
                      state: { comercianteId: id, planillaId: encontrada.planillaId },
                    });
                  } else {
                    setErrorFecha('No existe una planilla en esa fecha');
                  }
                }}
                className="w-full bg-[#1b1b1c] hover:bg-[#3b3b3b] text-white font-['Manrope'] font-bold text-[14px] rounded-[10px] py-3 transition-colors cursor-pointer"
              >
                Ver Planilla
              </button>
            </div>
          </div>

          {/* ── COLUMNA DERECHA ~65% ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-[16px] border border-[#f5f5f4] p-5">

              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h2 className="font-['Manrope'] font-bold text-[15px] sm:text-[16px] text-[#1b1b1c]">
                  Historial de Cierres Diarios
                </h2>
                <span className="font-['Inter'] text-[11px] sm:text-[12px] text-[#a8a29e]">
                  {planillasFiltradas.length} de {planillas.length} registros
                </span>
              </div>

              {/* Búsqueda planillas */}
              <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" width="14" height="14" fill="none" viewBox="0 0 16 16">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  value={busquedaPlanilla}
                  onChange={e => { setBusquedaPlanilla(e.target.value); setPagina(1); }}
                  placeholder="Buscar por fecha (ej. 2026-05)..."
                  className="bg-[#f6f3f3] border-none rounded-[10px] pl-9 pr-4 py-2 w-full font-['Inter'] text-[13px] text-[#1b1b1c] outline-none focus:ring-2 focus:ring-[#9e2016]/20"
                />
                {busquedaPlanilla && (
                  <button onClick={() => { setBusquedaPlanilla(''); setPagina(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#78716c] cursor-pointer text-xs">✕</button>
                )}
              </div>

              {/* Contenido */}
              {cargando ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[72px] bg-[#f6f3f3] rounded-[10px] animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="py-10 text-center">
                  <p className="font-['Inter'] text-[14px] text-[#dc2626]">{error}</p>
                </div>
              ) : planillas.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <svg width="44" height="44" fill="none" viewBox="0 0 44 44" className="text-[#d6d3d1]">
                    <rect x="6" y="9" width="32" height="28" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M14 6v6M30 6v6M6 18h32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M16 28h12M16 33h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="font-['Inter'] text-[15px] text-[#a8a29e]">Sin historial disponible</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[#f5f5f4]">
                  {planillasPagina.map((pl) => {
                    const fecha     = parseFecha(pl.fecha);
                    const mes       = MESES[fecha.getMonth()];
                    const dia       = String(fecha.getDate()).padStart(2, '0');
                    const diaSemana = DIAS_SEMANA[fecha.getDay()];
                    const shortId   = (pl.planillaId ?? '').slice(-4).toUpperCase();
                    const completada = pl.cerrada ?? true;

                    return (
                      <div
                        key={pl.planillaId}
                        onClick={() => navigate(`/ventas/planilla/${pl.planillaId}`, { state: { comercianteId: id, planillaId: pl.planillaId } })}
                        className={`flex items-center gap-4 py-4 px-2 hover:bg-[#fafafa] transition-colors cursor-pointer rounded-[8px] ${
                          !completada ? 'border-l-[3px] border-[#9e2016]' : ''
                        }`}
                      >
                        {/* Badge fecha */}
                        <div className="bg-[#9e2016] rounded-[8px] px-2.5 py-1.5 flex flex-col items-center min-w-[48px] shrink-0">
                          <span className="font-['Inter'] font-bold text-[9px] text-white/75 uppercase tracking-[0.5px] leading-none">
                            {mes}
                          </span>
                          <span className="font-['Manrope'] font-extrabold text-[22px] text-white leading-[28px]">
                            {dia}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-['Manrope'] font-semibold text-[14px] text-[#1b1b1c]">
                              Cierre de Operación {diaSemana}
                            </p>
                            <span className={`flex items-center gap-1 font-['Inter'] font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                              completada
                                ? 'bg-[#dcfce7] text-[#16a34a]'
                                : 'bg-[#fff7ed] text-[#ea580c]'
                            }`}>
                              {completada ? (
                                <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] inline-block" />
                              )}
                              {completada ? 'Completado' : 'Bajo Revisión'}
                            </span>
                          </div>
                          <p className="font-['Inter'] text-[12px] text-[#a8a29e] mt-0.5">
                            ID: #GXL-{shortId}
                          </p>
                        </div>

                        {/* Métricas */}
                        <div className="flex gap-3 sm:gap-5 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                              Unidades
                            </p>
                            <p className="font-['Manrope'] font-semibold text-[15px] text-[#1b1b1c]">
                              {pl.unidadesVendidas ?? 0} u.
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                              Neto
                            </p>
                            <p className="font-['Manrope'] font-semibold text-[13px] sm:text-[15px] text-[#9e2016]">
                              {formatCOP(pl.ganancia)}
                            </p>
                          </div>
                        </div>

                        {/* Chevron */}
                        <svg width="16" height="16" fill="none" viewBox="0 0 16 16" className="text-[#d6d3d1] shrink-0">
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paginación */}
              {!cargando && totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-1 mt-5 pt-4 border-t border-[#f5f5f4]">
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#78716c] hover:bg-[#f6f3f3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPagina(p)}
                      className={`w-8 h-8 rounded-[6px] font-['Inter'] font-semibold text-[13px] transition-colors cursor-pointer ${
                        p === pagina
                          ? 'bg-[#9e2016] text-white'
                          : 'text-[#78716c] hover:bg-[#f6f3f3]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#78716c] hover:bg-[#f6f3f3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* ══ MODAL EDITAR COMERCIANTE ════════════════════════════════════════ */}
      {modalEditar && createPortal(
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 bg-black/45 backdrop-blur-sm ${
            isClosingModal ? 'animate-fade-out' : 'animate-fade-in'
          }`}
          onClick={handleCloseModal}
        >
          <div
            className={`bg-white rounded-[20px] w-full max-w-[760px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.18)] ${
              isClosingModal ? 'animate-scale-out' : 'animate-scale-in'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header rojo */}
            <div className="bg-[#9e2016] px-8 py-7 relative rounded-t-[20px]">
              <h2 className="font-['Manrope'] font-bold text-[28px] text-white leading-[34px]">
                Editar Comerciante
              </h2>
              <p className="font-['Inter'] font-normal text-[15px] text-white/80 mt-1">
                Modifica los datos del distribuidor registrado en la red GELOX.
              </p>
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute top-6 right-6 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <path d="M11 3L3 11M3 3l8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={submitEditar}>
              <div className="px-8 py-7 grid grid-cols-2 gap-x-8 gap-y-5">

                {/* Columna izquierda */}
                <div className="flex flex-col gap-5">
                  <div>
                    <label className={labelClass}>Nombre Completo</label>
                    <input
                      name="nombre"
                      value={formEditar.nombre}
                      onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: Luis Carlos"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Ubicación (Municipio)</label>
                    <CustomSelect
                      value={formEditar.municipio}
                      onChange={(val) => setFormEditar(f => ({ ...f, municipio: val }))}
                      options={MUNICIPIOS}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input
                      name="direccion"
                      value={formEditar.direccion}
                      onChange={e => setFormEditar(f => ({ ...f, direccion: e.target.value }))}
                      placeholder="Calle xx #xx-xx"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      name="telefono"
                      value={formEditar.telefono}
                      onChange={e => setFormEditar(f => ({ ...f, telefono: e.target.value }))}
                      placeholder="+57 ..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Placa del Carrito</label>
                    <input
                      name="placa"
                      value={formEditar.placa}
                      onChange={e => setFormEditar(f => ({ ...f, placa: e.target.value }))}
                      placeholder="Ej: ABC-123"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Documento</label>
                    <input
                      name="documento"
                      value={formEditar.documento}
                      onChange={e => setFormEditar(f => ({ ...f, documento: e.target.value }))}
                      placeholder="Número de documento"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Tipo de Documento</label>
                    <div className="flex gap-2">
                      {TIPOS_DOCUMENTO.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormEditar(f => ({ ...f, tipoDocumento: t }))}
                          className={`flex-1 py-2.5 rounded-[8px] font-['Manrope'] font-semibold text-[15px] cursor-pointer transition-colors ${
                            formEditar.tipoDocumento === t
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
                    <label className={labelClass}>EPS</label>
                    <input
                      name="eps"
                      value={formEditar.eps}
                      onChange={e => setFormEditar(f => ({ ...f, eps: e.target.value }))}
                      placeholder="Ej: Sura, Nueva EPS..."
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="flex flex-col gap-5">
                  <div>
                    <label className={labelClass}>Contacto de Emergencia</label>
                    <input
                      name="contactoEmergenciaNombre"
                      value={formEditar.contactoEmergenciaNombre}
                      onChange={e => setFormEditar(f => ({ ...f, contactoEmergenciaNombre: e.target.value }))}
                      placeholder="Nombre completo"
                      className={inputClass}
                    />
                    <input
                      name="contactoEmergenciaParentesco"
                      value={formEditar.contactoEmergenciaParentesco}
                      onChange={e => setFormEditar(f => ({ ...f, contactoEmergenciaParentesco: e.target.value }))}
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
                          onClick={() => setFormEditar(f => ({ ...f, tallaUniforme: t }))}
                          className={`flex-1 py-2.5 rounded-[8px] font-['Manrope'] font-semibold text-[15px] cursor-pointer transition-colors ${
                            formEditar.tallaUniforme === t
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
                        ref={inputFileEditRef}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormEditar(f => ({ ...f, foto: file }));
                            setFotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="preview"
                          className="w-[72px] h-[72px] rounded-full object-cover" />
                      ) : comercianteLocal.fotoUrl ? (
                        <img src={comercianteLocal.fotoUrl} alt="foto actual"
                          className="w-[72px] h-[72px] rounded-full object-cover opacity-60" />
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

                  {/* Estado del comerciante */}
                  <div>
                    <label className={labelClass}>Estado del Comerciante</label>
                    <div className="flex items-center gap-3 bg-[#f6f3f3] rounded-[10px] px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setFormEditar(f => ({ ...f, activo: !f.activo }))}
                        className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
                          formEditar.activo ? 'bg-[#16a34a]' : 'bg-[#d6d3d1]'
                        }`}
                      >
                        <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                          formEditar.activo ? 'translate-x-7' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className={`font-['Inter'] font-semibold text-[14px] ${
                        formEditar.activo ? 'text-[#16a34a]' : 'text-[#a8a29e]'
                      }`}>
                        {formEditar.activo ? 'Comerciante Activo' : 'Comerciante Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {errorEditar && (
                <div className="px-8 pb-2">
                  <p className="font-['Inter'] text-[13px] text-[#dc2626]">{errorEditar}</p>
                </div>
              )}

              {/* Footer */}
              <div className="px-8 pb-7 flex gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={guardando}
                  className="flex-1 bg-[#f6f3f3] hover:bg-[#e7e5e4] disabled:opacity-50 text-[#57534e] font-['Manrope'] font-semibold text-[16px] rounded-[10px] px-8 py-3.5 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-[2] bg-[#9e2016] hover:bg-[#c0392b] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[16px] rounded-[10px] px-8 py-3.5 cursor-pointer transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}

// ── Sub-componente reutilizable para ícono + texto en la tarjeta de perfil ──
function DataItem({ icon, label }) {
  const icons = {
    map: (
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#9e2016] shrink-0">
        <path d="M7 1a4 4 0 0 1 4 4c0 3.5-4 8-4 8S3 8.5 3 5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="5" r="1.2" fill="currentColor"/>
      </svg>
    ),
    pin: (
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#78716c] shrink-0">
        <path d="M7 1a4 4 0 0 1 4 4c0 3.5-4 8-4 8S3 8.5 3 5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="5" r="1.2" fill="currentColor"/>
      </svg>
    ),
    phone: (
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#78716c] shrink-0">
        <path d="M2 3a.5.5 0 0 1 .5-.5h1.618a.5.5 0 0 1 .447.276l.894 1.789a.5.5 0 0 1-.057.53L4.59 6.11a5.5 5.5 0 0 0 2.8 2.8l1.015-.812a.5.5 0 0 1 .53-.057l1.789.894A.5.5 0 0 1 11 9.382V11a.5.5 0 0 1-.5.5C4.5 11.5 2 7 2 3z"
          stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    ),
    person: (
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#78716c] shrink-0">
        <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M2 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    doc: (
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#78716c] shrink-0">
        <rect x="2.5" y="1.5" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M5 5h4M5 7.5h4M5 10h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    health: (
      <svg width="14" height="14" fill="none" viewBox="0 0 14 14" className="text-[#78716c] shrink-0">
        <path d="M7 2.5C5.5 1 3 1.5 2 3.5c-1 2 0 4 5 7 5-3 6-5 5-7-1-2-3.5-2.5-5-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 5v4M5 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1.5">
      {icons[icon]}
      <span className="font-['Inter'] text-[14px] text-[#1b1b1c]">{label}</span>
    </div>
  );
}
