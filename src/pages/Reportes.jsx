// src/pages/Reportes.jsx
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppLayout from '../components/AppLayout';
import TablaRentabilidadCanal from '../components/reportes/tablarentabilidadcanal';
import FiltroPeriodo from '../components/FiltroPeriodo';
import CierreCaja from '../components/CierreCaja';
import {
    getReporteFinanciero,
    getGraficaInversionIngresos,
    getReportePorCanal,
} from '../services/reporteService';

/* ── Helpers ── */
function fmt(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(n);
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
    // anio
    return { fechaInicio: `${hoy.getFullYear()}-01-01`, fechaFin: today };
}

/* ── KPI Card ── */
function KpiCard({ label, value, sub, positive }) {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted font-inter">{label}</span>
            <span className={`font-display text-2xl font-bold truncate ${positive ? 'text-green-600' : 'text-ink'}`}>
                {value}
            </span>
            {sub && <span className="text-xs text-muted">{sub}</span>}
        </div>
    );
}

/* ── Tooltip personalizado del gráfico ── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-border rounded-xl p-3 shadow-md text-sm">
            <p className="font-semibold text-ink mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {fmt(p.value)}
                </p>
            ))}
        </div>
    );
}

/* ── Componente principal ── */
export default function Reportes() {
    const [filtro, setFiltro] = useState({ tipo: 'mes' });
    const [reporte, setReporte] = useState(null);
    const [grafica, setGrafica] = useState([]);
    const [canales, setCanales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { fechaInicio, fechaFin } = rangoFromFiltro(filtro);
            const [rep, graf, can] = await Promise.all([
                getReporteFinanciero(fechaInicio, fechaFin),
                getGraficaInversionIngresos(fechaInicio, fechaFin),
                getReportePorCanal(fechaInicio, fechaFin),
            ]);
            setReporte(rep);
            setGrafica(graf);
            setCanales(can?.canales ?? can ?? []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [filtro]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    return (
        <AppLayout>

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">
                        Análisis de Rentabilidad
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        Monitoreo de flujo de caja y desempeño de distribución Gelox.
                    </p>
                </div>
                {/* RF16 — Filtro de período */}
                <FiltroPeriodo onChange={setFiltro} />
            </div>

            {error && (
                <div className="mb-6 rounded-xl bg-error-bg border border-danger/20 text-error-fg px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* ── RF12 — KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                    label="Inversión Total"
                    value={loading ? '…' : fmt(reporte?.totalInversion)}
                    sub={reporte ? '+4.2% vs mes anterior' : undefined}
                />
                <KpiCard
                    label="Ingresos Totales"
                    value={loading ? '…' : fmt(reporte?.ingresosTotales)}
                    sub={reporte ? '+12.8% vs mes anterior' : undefined}
                />
                <KpiCard
                    label="Utilidad Bruta"
                    value={loading ? '…' : fmt(reporte?.utilidadNeta)}
                    sub={reporte ? 'Meta alcanzada' : undefined}
                    positive
                />
                <KpiCard
                    label="Margen de Ganancia"
                    value={loading ? '…' : reporte ? `${reporte.margenGanancia.toFixed(0)}%` : '—'}
                />
            </div>

            {/* ── RF13 Gráfica + RF15 Cierre de caja ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                {/* Comparativa de Rendimiento — RF13 */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-6">
                    <h2 className="font-display font-bold text-lg text-ink leading-6 mb-0.5">
                        Comparativa de Rendimiento
                    </h2>
                    <p className="text-xs text-muted mb-4">Ingresos vs inversión por semana</p>

                    {loading ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted">
                            Cargando gráfica…
                        </div>
                    ) : grafica.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted">
                            Sin datos para el período seleccionado
                        </div>
                    ) : (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={grafica} barGap={4} barCategoryGap="30%">
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11, fill: '#8d706c' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: 12 }}
                                        formatter={(v) => <span className="text-muted">{v}</span>}
                                    />
                                    <Bar dataKey="ingresos"  name="Ingresos"  fill="#9e2016" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="inversion" name="Inversión" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Cierre de Caja Diario — RF15 */}
                <CierreCaja efectivoEsperado={reporte?.ingresosTotales ?? 0} />
            </div>

            {/* ── RF14 — Tabla Rentabilidad por Canal ── */}
            <TablaRentabilidadCanal data={canales} />

        </AppLayout>
    );
}
