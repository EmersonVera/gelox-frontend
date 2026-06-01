// src/pages/administrador/Reportes.jsx
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppLayout from '../../components/AppLayout';
import TablaRentabilidadCanal from '../../components/reportes/tablarentabilidadcanal';
import FiltroPeriodo from '../../components/FiltroPeriodo';
import CierreCaja from '../../components/CierreCaja';
import {
    getReporteFinanciero,
    getGraficaInversionIngresos,
    getReportePorCanal,
} from '../../services/reporteService';

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

export default function Reportes() {
    const [filtro, setFiltro] = useState({ tipo: 'mes' });
    const [filtroActivo, setFiltroActivo] = useState({ tipo: 'mes' });
    const [reporte, setReporte] = useState(null);
    const [grafica, setGrafica] = useState([]);
    const [canales, setCanales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const cargarDatos = useCallback(async () => {
        setError(null);
        const { fechaInicio, fechaFin } = rangoFromFiltro(filtro);
        const mensajeValidacion = validarRangoFechas(fechaInicio, fechaFin);
        if (mensajeValidacion) { setError(mensajeValidacion); return; }
        setLoading(true);
        try {
            const [rep, graf, can] = await Promise.all([
                getReporteFinanciero(fechaInicio, fechaFin),
                getGraficaInversionIngresos(fechaInicio, fechaFin, filtro.tipo.toUpperCase()),
                getReportePorCanal(fechaInicio, fechaFin),
            ]);
            setReporte(rep);
            setGrafica(graf);
            setCanales(can?.canales ?? can ?? []);
            setFiltroActivo(filtro);
        } catch (e) {
            const mensajeBackend = e?.response?.data?.message;
            setError(mensajeBackend ?? e.message ?? 'Error inesperado al cargar los datos.');
        } finally {
            setLoading(false);
        }
    }, [filtro]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    return (
        <AppLayout>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">
                        Análisis de Rentabilidad
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        Monitoreo de flujo de caja y desempeño de distribución Gelox.
                    </p>
                </div>
                <FiltroPeriodo defaultTipo="mes" onChange={setFiltro} />
            </div>

            {error && (
                <div className="mb-6 rounded-xl bg-error-bg border border-danger/20 text-error-fg px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard label="Inversión Total"    value={loading ? '…' : fmt(reporte?.totalInversion)}  sub={reporte ? '+4.2% vs mes anterior' : undefined} />
                <KpiCard label="Ingresos Totales"   value={loading ? '…' : fmt(reporte?.ingresosTotales)} sub={reporte ? '+12.8% vs mes anterior' : undefined} />
                <KpiCard
                    label="Utilidad Bruta"
                    value={loading ? '…' : fmt(reporte?.utilidadNeta)}
                    sub={reporte
                        ? ((reporte.utilidadNeta ?? 0) < 0 ? 'Utilidad negativa' : 'Meta alcanzada')
                        : undefined}
                    positive={!!reporte && (reporte.utilidadNeta ?? 0) >= 0}
                    negative={!!reporte && (reporte.utilidadNeta ?? 0) < 0}
                />
                <KpiCard label="Margen de Ganancia" value={loading ? '…' : reporte ? `${(reporte.margenGanancia ?? 0).toFixed(0)}%` : '—'} />
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
        </AppLayout>
    );
}
