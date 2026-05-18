// src/pages/Reportes.jsx
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppLayout from '../components/AppLayout';
import TablaRentabilidadCanal from '../components/reportes/tablarentabilidadcanal';
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

function isoToday() {
    return new Date().toISOString().slice(0, 10);
}

function isoFirstOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/* ── Filtro de período ── */
const PERIODOS = ['Día', 'Semana', 'Mes', 'Anual'];

function rangoFromPeriodo(periodo) {
    const hoy = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = iso(hoy);

    if (periodo === 'Día') return { fechaInicio: today, fechaFin: today };

    if (periodo === 'Semana') {
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
        return { fechaInicio: iso(lunes), fechaFin: today };
    }

    if (periodo === 'Mes') {
        return {
            fechaInicio: `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-01`,
            fechaFin: today,
        };
    }

    // Anual
    return { fechaInicio: `${hoy.getFullYear()}-01-01`, fechaFin: today };
}

/* ── KPI Card ── */
function KpiCard({ label, value, sub, subColor }) {
    return (
        <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
            <span className={`font-display text-2xl font-bold truncate ${subColor === 'green' ? 'text-green-600' : 'text-ink'}`}>
                {value}
            </span>
            {sub && (
                <span className="text-xs text-muted">{sub}</span>
            )}
        </div>
    );
}

/* ── Tooltip personalizado del gráfico ── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-border rounded-xl p-3 shadow-lg text-sm">
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
    const [periodo, setPeriodo] = useState('Mes');
    const [reporte, setReporte] = useState(null);
    const [grafica, setGrafica] = useState([]);
    const [canales, setCanales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cierre de caja
    const [efectivoFisico, setEfectivoFisico] = useState('');
    const [procesandoCierre, setProcesandoCierre] = useState(false);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { fechaInicio, fechaFin } = rangoFromPeriodo(periodo);
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
    }, [periodo]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Diferencia cierre de caja
    const efectivoEsperado = reporte?.ingresosTotales ?? 0;
    const efectivoNum = parseFloat(efectivoFisico.replace(/\D/g, '')) || 0;
    const diferencia = efectivoNum - efectivoEsperado;

    function handleProcesarCierre() {
        // TODO: llamar endpoint de cierre de caja cuando esté disponible
        setProcesandoCierre(true);
        setTimeout(() => setProcesandoCierre(false), 1200);
    }

    const mesLabel = (() => {
        const { fechaInicio } = rangoFromPeriodo(periodo);
        const d = new Date(fechaInicio + 'T00:00:00');
        return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    })();

    return (
        <AppLayout>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-ink">Análisis de Rentabilidad</h1>
                    <p className="text-sm text-muted mt-0.5">Monitoreo de flujo de caja y desempeño de distribución Gelox.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Filtros de período */}
                    <div className="flex items-center gap-1 bg-surface rounded-xl p-1">
                        {PERIODOS.map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriodo(p)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${periodo === p
                                        ? 'bg-[#9e2016] text-white shadow-sm'
                                        : 'text-muted hover:text-ink'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    {/* Etiqueta de mes */}
                    <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-sm text-ink bg-white capitalize">
                        <CalendarIcon />
                        {mesLabel}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* KPIs — RF12 */}
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
                    subColor="green"
                />
                <KpiCard
                    label="Margen de Ganancia"
                    value={loading ? '…' : reporte ? `${reporte.margenGanancia.toFixed(0)}%` : '—'}
                />
            </div>

            {/* Gráfica + Cierre de caja */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Gráfica RF13 */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6">
                    <h2 className="font-display font-semibold text-ink mb-0.5">Comparativa de Rendimiento</h2>
                    <p className="text-xs text-muted mb-4">Ingresos vs inversión por semana</p>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted">Cargando gráfica…</div>
                    ) : grafica.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-sm text-muted">Sin datos</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={grafica} barGap={4} barCategoryGap="30%">
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: 12 }}
                                    formatter={(v) => <span style={{ color: '#78716c' }}>{v}</span>}
                                />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#9e2016" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="inversion" name="Inversión" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Cierre de caja — RF15 */}
                <div className="bg-white rounded-2xl border border-border p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#9e2016] flex items-center justify-center shrink-0">
                            <CajaIcon />
                        </div>
                        <div>
                            <h2 className="font-display font-semibold text-ink text-sm leading-tight">Cierre de Caja Diario</h2>
                            <p className="text-xs text-muted">Reconciliación de efectivo al cierre del día.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted block mb-1">
                                Efectivo esperado
                            </label>
                            <div className="border border-border rounded-xl px-3 py-2 text-sm text-ink bg-surface">
                                {fmt(efectivoEsperado)}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted block mb-1">
                                Efectivo real en caja
                            </label>
                            <div className="flex items-center border border-border rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-[#9e2016]/30">
                                <span className="pl-3 text-[#9e2016] font-bold text-sm">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={efectivoFisico}
                                    onChange={(e) => setEfectivoFisico(e.target.value)}
                                    className="flex-1 px-2 py-2 text-sm outline-none bg-transparent"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        className={`rounded-xl px-3 py-2 text-sm font-medium border ${diferencia === 0
                                ? 'bg-surface border-border text-muted'
                                : diferencia > 0
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                    >
                        Diferencia (Sobrante/Faltante):{' '}
                        <span className="font-bold">
                            {efectivoFisico === '' ? '$0' : fmt(diferencia)}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleProcesarCierre}
                        disabled={procesandoCierre || !efectivoFisico}
                        className="w-full bg-ink text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1c1917] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {procesandoCierre ? 'Procesando…' : 'Procesar Cierre de Caja'}
                    </button>
                </div>
            </div>

            {/* Tabla rentabilidad por canal — RF14 */}
            <TablaRentabilidadCanal data={canales} />
        </AppLayout>
    );
}

/* ── Micro-iconos inline ── */
function CalendarIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}
function CajaIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 7l1-4h18l1 4" /><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 12H8" /><path d="M12 12v4" />
        </svg>
    );
}