// src/pages/administrador/Reportes.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppLayout from '../../components/AppLayout';
import SuccessToast from '../../components/SuccessToast';
import { useIdentidad } from '../../context/IdentidadContext';
import TablaRentabilidadCanal from '../../components/reportes/tablarentabilidadcanal';
import FiltroPeriodo from '../../components/FiltroPeriodo';
import CierreCaja from '../../components/CierreCaja';
import {
    getReporteFinanciero,
    getGraficaInversionIngresos,
    getReportePorCanal,
} from '../../services/reporteService';
import {
    SECCIONES_REPORTE,
    exportarReporteFinanciero,
    descargarArchivo,
} from '../../services/exportacionService';
import { mensajeError } from '../../components/inventarios/proveedoresUtils';

/* ── Helpers ── */
function fmt(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(n);
}

function validarRangoFechas(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return null;
    if (fechaInicio > fechaFin)
        return 'La fecha de inicio no puede ser posterior a la fecha fin.';
    return null;
}

function rangoFromFiltro(filtro) {
    const hoy = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = iso(hoy);

    if (filtro.tipo === 'rango' && filtro.desde && filtro.hasta)
        return { fechaInicio: filtro.desde, fechaFin: filtro.hasta };
    if (filtro.tipo === 'dia')
        return { fechaInicio: today, fechaFin: today };
    if (filtro.tipo === 'semana') {
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
        return { fechaInicio: iso(lunes), fechaFin: today };
    }
    if (filtro.tipo === 'mes')
        return { fechaInicio: `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-01`, fechaFin: today };
    return { fechaInicio: `${hoy.getFullYear()}-01-01`, fechaFin: today };
}

function KpiCard({ label, value, sub, positive, negative }) {
    const colorClass = negative ? 'text-red-600' : positive ? 'text-green-600' : 'text-ink';
    return (
        <div className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col gap-1 min-w-0 ${negative ? 'border-red-200' : 'border-border'}`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted font-inter">{label}</span>
            <span className={`font-display text-2xl font-bold truncate ${colorClass}`}>
                {value}
            </span>
            {sub && <span className={`text-xs ${negative ? 'text-red-500 font-semibold' : 'text-muted'}`}>{sub}</span>}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="border border-border rounded-xl p-3 shadow-md text-sm" style={{ backgroundColor: '#fff' }}>
            <p className="font-semibold text-ink mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
            ))}
        </div>
    );
}

const SUBTITULOS_GRAFICA = {
    dia:   'Ingresos vs. inversión del día',
    semana:'Ingresos vs. inversión por día (semana actual)',
    mes:   'Ingresos vs. inversión por semana (mes actual)',
    anio:  'Ingresos vs. inversión por mes (año actual)',
};

const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function subtituloRango(desde, hasta) {
    if (!desde || !hasta) return 'Ingresos vs. inversión';
    const [ay, am, ad] = desde.split('-').map(Number);
    const [by, bm, bd] = hasta.split('-').map(Number);
    const mA = MESES_CORTO[am - 1];
    const mB = MESES_CORTO[bm - 1];
    let rango;
    if (ay === by && am === bm) {
        rango = ad === bd ? `${ad} ${mA} ${ay}` : `${ad}–${bd} ${mA} ${ay}`;
    } else if (ay === by) {
        rango = `${ad} ${mA}–${bd} ${mB} ${ay}`;
    } else {
        rango = `${ad} ${mA} ${ay}–${bd} ${mB} ${by}`;
    }
    return `Ingresos vs. inversión (${rango})`;
}

function IconoArchivo() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
    );
}

function BotonExportar({ icono, activo, deshabilitado, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={deshabilitado}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-ink shadow-sm hover:bg-surface transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <span className="text-primary">{icono}</span>
            {activo ? 'Generando…' : children}
        </button>
    );
}

/** «1–19 nov 2026» del período elegido, como en el mockup. */
function subtituloPeriodoExportar(filtro) {
    const { fechaInicio, fechaFin } = rangoFromFiltro(filtro);
    const [ay, am, ad] = fechaInicio.split('-').map(Number);
    const [by, bm, bd] = fechaFin.split('-').map(Number);
    const mA = MESES_CORTO[am - 1];
    const mB = MESES_CORTO[bm - 1];
    if (ay === by && am === bm) return ad === bd ? `${ad} ${mA} ${ay}` : `${ad}–${bd} ${mA} ${ay}`;
    if (ay === by) return `${ad} ${mA}–${bd} ${mB} ${ay}`;
    return `${ad} ${mA} ${ay}–${bd} ${mB} ${by}`;
}

export default function Reportes() {
    const [filtro, setFiltro] = useState({ tipo: 'mes' });
    const [filtroActivo, setFiltroActivo] = useState({ tipo: 'mes' });
    const [reporte, setReporte] = useState(null);
    const [grafica, setGrafica] = useState([]);
    const [canales, setCanales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [secciones, setSecciones] = useState(SECCIONES_REPORTE.map((s) => s.value));
    const [exportando, setExportando] = useState(null); // 'excel' | 'pdf' | null
    const [errorExportar, setErrorExportar] = useState('');
    const [descargado, setDescargado] = useState(''); // nombre del último archivo descargado
    const { identidad } = useIdentidad();

    useEffect(() => {
        let cancelado = false;
        Promise.resolve().then(async () => {
            if (cancelado) return;
            const { fechaInicio, fechaFin } = rangoFromFiltro(filtro);
            const mensajeValidacion = validarRangoFechas(fechaInicio, fechaFin);
            if (mensajeValidacion) {
                setError(mensajeValidacion);
                return;
            }
            setLoading(true);
            try {
                const [rep, graf, can] = await Promise.all([
                    getReporteFinanciero(fechaInicio, fechaFin),
                    getGraficaInversionIngresos(fechaInicio, fechaFin, filtro.tipo.toUpperCase()),
                    getReportePorCanal(fechaInicio, fechaFin),
                ]);
                if (cancelado) return;
                setError(null);
                setReporte(rep);
                setGrafica(graf);
                setCanales(can?.canales ?? can ?? []);
                setFiltroActivo(filtro);
            } catch (e) {
                if (cancelado) return;
                const mensajeBackend = e?.response?.data?.message;
                setError(mensajeBackend ?? e.message ?? 'Error inesperado al cargar los datos.');
            } finally {
                if (!cancelado) setLoading(false);
            }
        });
        return () => { cancelado = true; };
    }, [filtro]);

    const alternarSeccion = (valor) =>
        setSecciones((actuales) =>
            actuales.includes(valor) ? actuales.filter((s) => s !== valor) : [...actuales, valor]);

    // Usa el período elegido en FiltroPeriodo (tipo y fechas), igual que la pantalla.
    const exportar = async (formato) => {
        setErrorExportar('');
        const { fechaInicio, fechaFin } = rangoFromFiltro(filtro);
        const mensajeValidacion = validarRangoFechas(fechaInicio, fechaFin);
        if (mensajeValidacion) { setErrorExportar(mensajeValidacion); return; }
        if (secciones.length === 0) { setErrorExportar('Marca al menos una sección para exportar.'); return; }
        setExportando(formato);
        try {
            const { blob, nombre } = await exportarReporteFinanciero(formato, {
                tipo: filtro.tipo.toUpperCase(),
                fechaInicio,
                fechaFin,
                secciones,
            });
            descargarArchivo(blob, nombre);
            setDescargado(nombre);
        } catch (e) {
            setErrorExportar(mensajeError(e, 'No se pudo generar el archivo. Intenta de nuevo.'));
        } finally {
            setExportando(null);
        }
    };

    return (
        <AppLayout>
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
                <div>
                    <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">
                        Análisis de Rentabilidad
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        Monitoreo de flujo de caja y desempeño de distribución Gelox.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap xl:justify-end">
                    <FiltroPeriodo defaultTipo="mes" onChange={setFiltro} />
                    <span className="hidden xl:block w-px h-8 bg-divider" aria-hidden="true" />
                    <BotonExportar
                        icono={<IconoArchivo />}
                        activo={exportando === 'excel'}
                        deshabilitado={exportando !== null}
                        onClick={() => exportar('excel')}
                    >
                        Exportar Excel
                    </BotonExportar>
                    <BotonExportar
                        icono={<IconoArchivo />}
                        activo={exportando === 'pdf'}
                        deshabilitado={exportando !== null}
                        onClick={() => exportar('pdf')}
                    >
                        Exportar PDF
                    </BotonExportar>
                </div>
            </div>

            <div className="mb-8 flex flex-col items-start xl:items-end gap-1.5">
                <fieldset className="flex items-center gap-x-5 gap-y-2 flex-wrap xl:justify-end">
                    <legend className="sr-only">Secciones a exportar</legend>
                    <span className="text-sm font-semibold text-ink" aria-hidden="true">Secciones:</span>
                    {SECCIONES_REPORTE.map((s) => (
                        <label key={s.value} className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
                            <input
                                type="checkbox"
                                checked={secciones.includes(s.value)}
                                onChange={() => alternarSeccion(s.value)}
                                className="w-4 h-4 accent-primary"
                            />
                            {s.label}
                        </label>
                    ))}
                </fieldset>
                <p className="text-xs text-muted xl:text-right">
                    Se exporta el período seleccionado ({subtituloPeriodoExportar(filtro)}).
                    {' '}El encabezado con el logo, el nombre y el color de {identidad?.nombreComercial || 'tu distribuidora'} siempre se incluye.
                </p>
            </div>

            {errorExportar && (
                <div role="alert" className="mb-6 rounded-xl bg-error-bg border border-danger/20 text-error-fg px-4 py-3 text-sm">
                    {errorExportar}
                </div>
            )}

            {error && (
                <div className="mb-6 rounded-xl bg-error-bg border border-danger/20 text-error-fg px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Subtítulos descriptivos: antes había variaciones fijas ("+4.2%", "+12.8%") que no se calculaban */}
                <KpiCard label="Inversión Total"    value={loading ? '…' : fmt(reporte?.totalInversion)}  sub={reporte ? 'Pedidos recibidos de Nutresa' : undefined} />
                <KpiCard label="Ingresos Totales"   value={loading ? '…' : fmt(reporte?.ingresosTotales)} sub={reporte ? 'Ventanilla + rural + comerciantes' : undefined} />
                <KpiCard
                    label="Utilidad Bruta"
                    value={loading ? '…' : fmt(reporte?.utilidadNeta)}
                    sub={reporte
                        ? ((reporte.utilidadNeta ?? 0) < 0 ? 'Utilidad negativa' : 'Ingresos − inversión')
                        : undefined}
                    positive={!!reporte && (reporte.utilidadNeta ?? 0) >= 0}
                    negative={!!reporte && (reporte.utilidadNeta ?? 0) < 0}
                />
                <KpiCard
                    label="Margen de Ganancia"
                    value={loading ? '…' : reporte?.margenGanancia != null ? `${Number(reporte.margenGanancia).toFixed(0)}%` : '—'}
                    sub={reporte ? (reporte.margenGanancia != null ? 'Utilidad sobre inversión' : 'Sin inversión en el período') : undefined}
                />
            </div>

            {(() => {
                const mostrarCierre = filtroActivo.tipo === 'dia' || filtroActivo.tipo === 'rango';
                return (
                    <div className={`grid grid-cols-1 gap-4 mb-6 ${mostrarCierre ? 'lg:grid-cols-3' : ''}`}>
                        <div className={`${mostrarCierre ? 'lg:col-span-2' : ''} bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col`}>
                            <h2 className="font-display font-bold text-lg text-ink leading-6 mb-0.5">Comparativa de Rendimiento</h2>
                            <p className="text-xs text-muted mb-4">
                                {filtroActivo.tipo === 'rango'
                                    ? subtituloRango(filtroActivo.desde, filtroActivo.hasta)
                                    : (SUBTITULOS_GRAFICA[filtroActivo.tipo] ?? 'Ingresos vs. inversión')}
                            </p>
                            {loading ? (
                                <div className="flex-1 flex items-center justify-center text-sm text-muted">Cargando gráfica…</div>
                            ) : grafica.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-sm text-muted">Sin datos para el período seleccionado</div>
                            ) : (
                                <div className="flex-1 min-h-[16rem]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={grafica} barGap={4} barCategoryGap="30%">
                                            <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: '#8d706c' }} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} />
                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }}
                                                formatter={(v) => <span className="text-muted">{v}</span>} />
                                            <Bar dataKey="ingresos"  name="Ingresos"  fill="#9e2016" style={{ fill: '#9e2016' }} isAnimationActive animationDuration={900} animationEasing="ease-out" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="inversion" name="Inversión" fill="#d6d3d1" style={{ fill: '#d6d3d1' }} isAnimationActive animationDuration={900} animationEasing="ease-out" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                        {mostrarCierre && (
                            <CierreCaja efectivoEsperado={reporte?.ingresosTotales ?? 0} />
                        )}
                    </div>
                );
            })()}

            <TablaRentabilidadCanal data={canales} />
            <SuccessToast
                message={descargado ? `Reporte descargado: ${descargado}` : ''}
                show={!!descargado}
                onClose={() => setDescargado('')}
                type="success"
            />
        </AppLayout>
    );
}
