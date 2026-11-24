// src/pages/plataforma/PanelPlataforma.jsx — RF69: indicadores consolidados de la plataforma
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppLayout from '../../components/AppLayout';
import FiltroPeriodo from '../../components/FiltroPeriodo';
import EstadoBadge from '../../components/plataforma/EstadoBadge';
import {
  AlertIcon, BuildingIcon, DatabaseIcon, RefreshIcon, SparklesIcon, TrendingUpIcon, UsersIcon,
} from '../../components/plataforma/IconosPlataforma';
import {
  CUOTAS, ESTADOS_DISTRIBUIDORA, ORDEN_ESTADOS, UMBRAL_CUOTA, colorUso, fechaISO, formatoMB, formatoNumero,
  formatoPesos, formatoPesosCorto, iniciales, mensajeError, porcentajeUso, textoUso,
} from '../../components/plataforma/plataformaUtils';
import { USAR_MOCK, obtenerPanel } from '../../services/plataformaService';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Periodo del FiltroPeriodo → { desde, hasta } en YYYY-MM-DD. La semana empieza el lunes. */
function rangoDe({ tipo, desde, hasta }) {
  const hoy = new Date();
  const fin = fechaISO(hoy);
  if (tipo === 'rango' && desde && hasta) return desde <= hasta ? { desde, hasta } : { desde: hasta, hasta: desde };
  if (tipo === 'dia') return { desde: fin, hasta: fin };
  if (tipo === 'semana') {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    return { desde: fechaISO(lunes), hasta: fin };
  }
  if (tipo === 'anio') return { desde: `${hoy.getFullYear()}-01-01`, hasta: fin };
  return { desde: `${fin.slice(0, 7)}-01`, hasta: fin };
}

const partes = (iso) => iso.split('-').map(Number);

/** «1–22 nov 2026», «22 nov 2026» o «15/10/2026 – 22/11/2026». */
function textoRango(desde, hasta) {
  const [y1, m1, d1] = partes(desde);
  const [y2, m2, d2] = partes(hasta);
  if (desde === hasta) return `${d1} ${MESES_CORTOS[m1 - 1]} ${y1}`;
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MESES_CORTOS[m1 - 1]} ${y1}`;
  const f = (d, m, y) => `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  return `${f(d1, m1, y1)} – ${f(d2, m2, y2)}`;
}

/** Serie diaria del backend → una barra por mes. El último mes va marcado si todavía no termina. */
function seriePorMes(serie, hasta) {
  const meses = new Map();
  serie.forEach((p) => {
    const clave = p.fecha.slice(0, 7);
    const m = meses.get(clave) ?? { clave, ventas: 0, transacciones: 0, llamadasIa: 0, usuariosNuevos: 0 };
    m.ventas += Number(p.ventas ?? 0);
    m.transacciones += Number(p.transacciones ?? 0);
    m.llamadasIa += Number(p.llamadasIa ?? 0);
    m.usuariosNuevos += Number(p.usuariosNuevos ?? 0);
    meses.set(clave, m);
  });
  const [yh, mh, dh] = partes(hasta);
  const ultimoDia = new Date(yh, mh, 0).getDate();
  return [...meses.values()].sort((a, b) => a.clave.localeCompare(b.clave)).map((m) => {
    const [y, mes] = partes(m.clave);
    const parcial = y === yh && mes === mh && dh < ultimoDia;
    const etiqueta = MESES_CORTOS[mes - 1].charAt(0).toUpperCase() + MESES_CORTOS[mes - 1].slice(1);
    return { ...m, anio: y, mes, parcial, etiqueta: parcial ? `${etiqueta}*` : etiqueta };
  });
}

const METRICAS = [
  { clave: 'ventas',         label: 'Ventas',        formato: formatoPesos, eje: (v) => formatoPesosCorto(v).replace(' M', 'M') },
  { clave: 'transacciones',  label: 'Transacciones', formato: formatoNumero, eje: formatoNumero },
  { clave: 'llamadasIa',     label: 'Llamadas IA',   formato: formatoNumero, eje: formatoNumero },
  { clave: 'usuariosNuevos', label: 'Usuarios',      formato: formatoNumero, eje: formatoNumero, nota: 'usuarios nuevos' },
];

function textoHace(iso, ahora) {
  if (!iso) return '';
  const min = Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'Actualizado hace un momento';
  if (min < 60) return `Actualizado hace ${min} min`;
  const h = Math.floor(min / 60);
  return `Actualizado hace ${h} h`;
}

/* ── Shared styles ── */
const card = 'bg-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)]';

function SectionTitle({ children, className = 'mb-4' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <span className="text-xs font-bold text-ink uppercase tracking-widest">{children}</span>
    </div>
  );
}

function Kpi({ label, icono, tono, valor, children, delay }) {
  return (
    <div className={`${card} p-5 flex flex-col animate-fade-in-up ${delay}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider leading-snug pt-1">{label}</span>
        <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${tono}`}>{icono}</span>
      </div>
      <div className="font-display text-[28px] font-extrabold text-ink tracking-tight leading-tight mt-1.5">{valor}</div>
      {children}
    </div>
  );
}

function BarraUso({ pct, className = 'h-2', color }) {
  return (
    <div className={`${className} rounded-full bg-border overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${color ?? colorUso(pct)}`}
        style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
      />
    </div>
  );
}

function TooltipSerie({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-border rounded-xl shadow-[0_4px_14px_rgba(0,0,0,0.08)] px-3 py-2.5 text-[13px] min-w-[190px]">
      <p className="font-semibold text-ink mb-1 first-letter:uppercase">
        {MESES[p.mes - 1]} {p.anio}{p.parcial ? ' (en curso)' : ''}
      </p>
      <div className="flex justify-between gap-4"><span className="text-muted">Ventas</span><strong>{formatoPesos(p.ventas)}</strong></div>
      <div className="flex justify-between gap-4"><span className="text-muted">Transacciones</span><span>{formatoNumero(p.transacciones)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted">Llamadas IA</span><span>{formatoNumero(p.llamadasIa)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-muted">Usuarios nuevos</span><span>{formatoNumero(p.usuariosNuevos)}</span></div>
    </div>
  );
}

/** Celda «usado / límite» de la tabla de consumo; en ámbar desde el 80 %. */
function CeldaUso({ uso, mb = false }) {
  if (!uso) return <span className="text-muted">—</span>;
  const pct = porcentajeUso(uso);
  const usado = mb ? formatoMB(uso.usado) : formatoNumero(uso.usado);
  const limite = uso.limite === null || uso.limite === undefined ? '∞' : (mb ? formatoMB(uso.limite) : formatoNumero(uso.limite));
  return (
    <span
      title={uso.limite == null ? 'Sin límite' : `${pct} % de la cuota`}
      className={pct !== null && pct >= 100 ? 'text-error-fg font-semibold' : pct !== null && pct >= UMBRAL_CUOTA ? 'text-amber-700 font-semibold' : 'text-ink'}
    >
      {usado} <span className="text-muted font-normal">/ {limite}</span>
    </span>
  );
}

export default function PanelPlataforma() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState({ tipo: 'mes' });
  const [recarga, setRecarga] = useState(0);
  const [metrica, setMetrica] = useState('ventas');
  const [resultado, setResultado] = useState(null); // { clave, datos?, error? }
  const [ahora, setAhora] = useState(() => Date.now());

  const { desde, hasta } = rangoDe(periodo);
  const clave = `${desde}|${hasta}|${recarga}`;
  const cargando = resultado?.clave !== clave;
  const datos = resultado?.datos ?? null;
  const error = !cargando ? resultado?.error : '';

  useEffect(() => {
    let vivo = true;
    obtenerPanel({ desde, hasta })
      .then((d) => { if (vivo) { setResultado({ clave, datos: d }); setAhora(Date.now()); } })
      .catch((err) => {
        if (vivo) setResultado((prev) => ({ clave, datos: prev?.datos ?? null, error: mensajeError(err, 'No se pudieron cargar los indicadores.') }));
      });
    return () => { vivo = false; };
  }, [clave, desde, hasta]);

  // «Actualizado hace N min» avanza solo, sin volver a consultar.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const meses = useMemo(() => (datos ? seriePorMes(datos.serie ?? [], datos.hasta ?? hasta) : []), [datos, hasta]);
  const parcial = meses.find((m) => m.parcial);
  const metricaActual = METRICAS.find((m) => m.clave === metrica);
  const datosGrafica = meses.map((m) => ({
    ...m,
    completo: m.parcial ? 0 : m[metrica],
    enCurso: m.parcial ? m[metrica] : 0,
  }));

  // Cuotas usadas en 80 % o más, de las distribuidoras que todavía operan.
  const cercaDelLimite = useMemo(() => (datos?.porDistribuidora ?? [])
    .filter((d) => d.estado !== 'INACTIVO')
    .flatMap((d) => CUOTAS.map((c) => ({ d, c, uso: d.uso?.[c.uso], pct: porcentajeUso(d.uso?.[c.uso]) })))
    .filter((x) => x.pct !== null && x.pct >= UMBRAL_CUOTA)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6), [datos]);

  const porEstado = datos?.distribuidoras?.porEstado ?? {};
  const totalDist = datos?.distribuidoras?.total ?? 0;
  const alm = datos?.almacenamiento ?? { usadoMb: 0, asignadoMb: 0 };
  const pctAlm = alm.asignadoMb > 0 ? Math.round((alm.usadoMb / alm.asignadoMb) * 100) : null;
  const rangoTexto = datos ? textoRango(datos.desde ?? desde, datos.hasta ?? hasta) : textoRango(desde, hasta);
  const primeraCarga = cargando && !datos;
  const [yh, mh] = partes(hasta);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Plataforma</p>
            <h1 className="font-display text-2xl font-extrabold text-ink tracking-tight">Panel de la plataforma</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">Indicadores consolidados de todas las distribuidoras de GELOX.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {datos?.generadoEn && (
              <button
                type="button"
                onClick={() => setRecarga((n) => n + 1)}
                disabled={cargando}
                title="Volver a consultar"
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition duration-300 disabled:opacity-60"
              >
                <span className={cargando ? 'animate-spin' : ''}><RefreshIcon /></span>
                {cargando ? 'Actualizando...' : textoHace(datos.generadoEn, ahora)}
              </button>
            )}
            <FiltroPeriodo defaultTipo="mes" onChange={setPeriodo} />
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm animate-slide-down">
            <span className="flex items-start gap-2"><span className="shrink-0 mt-0.5"><AlertIcon size={15} /></span>{error}</span>
            <button type="button" onClick={() => setRecarga((n) => n + 1)} className="shrink-0 font-semibold hover:underline">Reintentar</button>
          </div>
        )}

        {/* KPIs */}
        {primeraCarga ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`${card} h-[150px] animate-pulse`} />)}
          </div>
        ) : datos && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 transition-opacity duration-300 ${cargando ? 'opacity-60' : ''}`}>
            <Kpi label="Distribuidoras" tono="bg-primary-tint text-primary" icono={<BuildingIcon />} valor={formatoNumero(totalDist)} delay="">
              <div className="flex gap-0.5 h-2 my-2.5" aria-hidden>
                {ORDEN_ESTADOS.filter((e) => porEstado[e] > 0).map((e) => (
                  <span key={e} className={`rounded-full ${ESTADOS_DISTRIBUIDORA[e].dot}`} style={{ flex: porEstado[e] }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted">
                {[
                  ['ACTIVO', 'activa', 'activas'], ['PRUEBA', 'en prueba', 'en prueba'],
                  ['SUSPENDIDO', 'suspendida', 'suspendidas'], ['INACTIVO', 'inactiva', 'inactivas'],
                ].map(([e, uno, varios]) => (
                  <span key={e} className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className={`w-1.5 h-1.5 rounded-full ${ESTADOS_DISTRIBUIDORA[e].dot}`} />
                    {porEstado[e] ?? 0} {(porEstado[e] ?? 0) === 1 ? uno : varios}
                  </span>
                ))}
              </div>
            </Kpi>
            <Kpi label="Usuarios registrados" tono="bg-blue-50 text-blue-700" icono={<UsersIcon />} valor={formatoNumero(datos.usuarios?.registrados)} delay="[animation-delay:60ms]">
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                +{formatoNumero(datos.usuarios?.nuevos)} en el periodo · {formatoNumero(datos.usuarios?.habilitados)} habilitados
              </p>
            </Kpi>
            <Kpi label="Ventas registradas" tono="bg-emerald-50 text-emerald-700" icono={<TrendingUpIcon />} valor={formatoPesosCorto(datos.ventas?.valor)} delay="[animation-delay:120ms]">
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                {formatoNumero(datos.ventas?.transacciones)} transacciones · {rangoTexto}
              </p>
              {(datos.pedidosProveedor || datos.planillasLiquidadas != null) && (
                <p className="text-xs text-muted leading-relaxed">
                  {formatoNumero(datos.pedidosProveedor?.cantidad)} pedidos a proveedor · {formatoNumero(datos.planillasLiquidadas)} planillas liquidadas
                </p>
              )}
            </Kpi>
            <Kpi label="Almacenamiento" tono="bg-surface text-faint" icono={<DatabaseIcon />} valor={formatoMB(alm.usadoMb)} delay="[animation-delay:180ms]">
              <BarraUso pct={pctAlm} className="h-2 my-2.5" color="bg-[#78716c]" />
              <p className="text-xs text-muted leading-relaxed">
                {pctAlm === null ? 'Sin cuota de almacenamiento' : `${pctAlm} % de ${formatoMB(alm.asignadoMb)} asignados por plan`}
              </p>
            </Kpi>
            <Kpi label="Uso de IA" tono="bg-violet-50 text-violet-700" icono={<SparklesIcon />} valor={formatoNumero(datos.ia?.llamadas)} delay="[animation-delay:240ms]">
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                llamadas · voz {formatoNumero(datos.ia?.voz)} · recomendaciones {formatoNumero(datos.ia?.recomendaciones)}
              </p>
            </Kpi>
          </div>
        )}

        {/* Gráfica + cerca del límite */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_344px] gap-4">
          <section className={`${card} p-6 min-w-0 animate-fade-in-up [animation-delay:120ms]`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Volumen transaccional por periodo</h2>
                <p className="text-xs text-muted mt-0.5">
                  {metricaActual.nota ? `${metricaActual.label} nuevos` : metricaActual.label} de todas las distribuidoras
                  {meses.length > 0 && ` · ${MESES_CORTOS[meses[0].mes - 1]} – ${MESES_CORTOS[meses[meses.length - 1].mes - 1]} ${meses[meses.length - 1].anio}`}
                </p>
              </div>
              <div className="flex gap-1 bg-surface rounded-[10px] p-[3px] self-start overflow-x-auto max-w-full" role="tablist">
                {METRICAS.map((m) => (
                  <button
                    key={m.clave}
                    type="button"
                    role="tab"
                    aria-selected={metrica === m.clave}
                    onClick={() => setMetrica(m.clave)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-[7px] text-xs transition-all duration-200 ${
                      metrica === m.clave ? 'bg-white text-primary font-semibold shadow-sm' : 'text-muted font-medium hover:text-ink'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {primeraCarga ? (
              <div className="h-[260px] rounded-xl bg-surface/60 animate-pulse" />
            ) : (
              <div className={`h-[260px] transition-opacity duration-300 ${cargando ? 'opacity-60' : ''}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafica} barCategoryGap="38%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#f0eded" vertical={false} />
                    <XAxis dataKey="etiqueta" axisLine={{ stroke: '#e4e2e2' }} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#8d706c' }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      tick={{ fontFamily: 'Inter', fontSize: 11, fill: '#8d706c' }}
                      tickFormatter={metricaActual.eje}
                      allowDecimals={false}
                    />
                    <Tooltip content={<TooltipSerie />} cursor={{ radius: 6 }} />
                    <Bar dataKey="completo" stackId="m" fill="var(--color-primary)" style={{ fill: 'var(--color-primary)' }} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                    <Bar dataKey="enCurso" stackId="m" fill="var(--color-primary)" style={{ fill: 'var(--color-primary)', fillOpacity: 0.6 }} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {parcial && (
              <p className="text-xs text-muted mt-2">
                * {MESES[parcial.mes - 1].charAt(0).toUpperCase() + MESES[parcial.mes - 1].slice(1)} va del 1 al {partes(datos?.hasta ?? hasta)[2]} (mes en curso).
              </p>
            )}
          </section>

          <section className={`${card} p-6 animate-fade-in-up [animation-delay:180ms]`}>
            <SectionTitle className="mb-1.5">Cerca del límite del plan</SectionTitle>
            <p className="text-xs text-muted mb-3.5 leading-relaxed">
              Cuotas usadas en {UMBRAL_CUOTA} % o más. Al llegar al 100 % la distribuidora no puede crear más registros de ese tipo.
            </p>
            {primeraCarga ? (
              <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-surface animate-pulse" />)}</div>
            ) : cercaDelLimite.length === 0 ? (
              <div className="rounded-xl bg-surface px-4 py-6 text-center">
                <p className="text-sm font-semibold text-ink">Todo en orden</p>
                <p className="text-xs text-muted mt-0.5">Ninguna distribuidora está cerca de sus cuotas.</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {cercaDelLimite.map(({ d, c, uso, pct }) => (
                  <li key={`${d.distribuidoraId}-${c.uso}`} className="border-t border-border first:border-0 first:pt-0 py-3 last:pb-0">
                    <Link to={`/plataforma/distribuidoras/${d.distribuidoraId}`} className="flex gap-3 group">
                      <span className="w-7 h-7 rounded-[9px] bg-primary-tint text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {iniciales(d.nombreComercial)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex justify-between gap-2">
                          <span className="text-[13px] font-semibold text-ink truncate group-hover:text-primary transition duration-200">{d.nombreComercial}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${pct >= 100 ? 'bg-error-bg text-error-fg' : 'bg-amber-50 text-amber-700'}`}>
                            {pct} %
                          </span>
                        </span>
                        <span className="block text-xs text-muted mt-0.5 mb-1.5">
                          {c.uso === 'llamadasIaMes' ? 'Llamadas IA del mes' : c.label}: {textoUso(uso, c.mb)}
                        </span>
                        <BarraUso pct={pct} className="h-1.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Consumo por distribuidora */}
        <section className={`${card} overflow-hidden animate-fade-in-up [animation-delay:240ms]`}>
          <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-ink">
              <span className="text-faint"><BuildingIcon /></span>
              Consumo por distribuidora
            </div>
            <span className="text-xs text-muted">
              Uso / cuota del plan · llamadas IA de {MESES[mh - 1]} {yh} · ventas del periodo
              {USAR_MOCK && ' · Modo simulado'}
            </span>
          </div>
          {primeraCarga ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-muted/30 border-t-muted animate-spin" />
              Cargando consumo...
            </div>
          ) : !datos?.porDistribuidora?.length ? (
            <div className="py-14 text-center px-6">
              <p className="text-sm font-semibold text-ink">Aún no hay distribuidoras registradas.</p>
              <p className="text-xs text-muted mt-0.5">Cuando registres la primera, su consumo aparecerá aquí.</p>
            </div>
          ) : (
            <div className={`overflow-x-auto transition-opacity duration-300 ${cargando ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-surface text-left">
                    {['Distribuidora', 'Plan', 'Estado'].map((t, i) => (
                      <th key={t} className={`${i === 0 ? 'pl-6 pr-3' : 'px-3'} py-3 text-xs font-semibold text-muted uppercase tracking-wider`}>{t}</th>
                    ))}
                    {['Usuarios', 'Ventas del periodo', 'Almacenamiento', 'Llamadas IA'].map((t, i, arr) => (
                      <th key={t} className={`${i === arr.length - 1 ? 'pl-3 pr-6' : 'px-3'} py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right whitespace-nowrap`}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {datos.porDistribuidora.map((d) => (
                    <tr
                      key={d.distribuidoraId}
                      onClick={() => navigate(`/plataforma/distribuidoras/${d.distribuidoraId}`)}
                      className="hover:bg-surface/50 transition duration-150 cursor-pointer"
                    >
                      <td className="pl-6 pr-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 ${
                            d.estado === 'INACTIVO' ? 'bg-surface text-muted' : 'bg-primary-tint text-primary'
                          }`}>
                            {iniciales(d.nombreComercial)}
                          </div>
                          <div className="min-w-0 max-w-[190px]">
                            <div className="text-sm font-semibold text-ink truncate">{d.nombreComercial}</div>
                            <div className="text-xs text-muted truncate">{d.razonSocial}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-ink whitespace-nowrap">{d.planNombre ?? '—'}</td>
                      <td className="px-3 py-4"><EstadoBadge estado={d.estado} /></td>
                      <td className="px-3 py-4 text-sm text-right whitespace-nowrap"><CeldaUso uso={d.uso?.usuarios} /></td>
                      <td className="px-3 py-4 text-sm text-ink text-right whitespace-nowrap">{formatoPesos(d.ventas?.valor)}</td>
                      <td className="px-3 py-4 text-sm text-right whitespace-nowrap"><CeldaUso uso={d.uso?.almacenamientoMb} mb /></td>
                      <td className="pl-3 pr-6 py-4 text-sm text-right whitespace-nowrap"><CeldaUso uso={d.uso?.llamadasIaMes} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {datos?.porDistribuidora?.length > 0 && (
            <div className="border-t border-border px-6 py-3 flex items-center justify-between gap-3 text-xs text-muted">
              <span>{datos.porDistribuidora.length} distribuidora{datos.porDistribuidora.length !== 1 ? 's' : ''}</span>
              <Link to="/plataforma/distribuidoras" className="text-primary font-semibold hover:underline">Ver distribuidoras →</Link>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
