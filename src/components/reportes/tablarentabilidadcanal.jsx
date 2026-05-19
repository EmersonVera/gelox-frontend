// src/components/TablaRentabilidadCanal.jsx
const LABELS = {
    VENTANILLA: 'Ventanilla Principal',
    RURAL: 'Rutas Rurales',
    COMERCIANTES: 'Comerciantes independientes',
};

function margenColor(margen) {
    if (margen >= 30) return { color: '#16a34a', bg: '#dcfce7', arrow: '↑' };
    if (margen >= 10) return { color: '#ca8a04', bg: '#fef9c3', arrow: '—' };
    return { color: '#dc2626', bg: '#fee2e2', arrow: '↓' };
}

function fmt(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export default function TablaRentabilidadCanal({ data = [] }) {
    if (!data.length) {
        return (
            <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">
                Sin datos para el período seleccionado.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-white overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-border">
                <h2 className="font-display font-semibold text-ink text-base">Rentabilidad por Canal de Venta</h2>
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        {['Canal', 'Ingresos Totales', 'Inversión Relativa', 'Margen Bruto'].map((h) => (
                            <th
                                key={h}
                                className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted text-left"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => {
                        const { color, bg, arrow } = margenColor(row.margen);
                        return (
                            <tr
                                key={row.canal}
                                className={`border-b border-border transition-colors hover:bg-surface ${i === data.length - 1 ? 'border-none' : ''}`}
                            >
                                <td className="px-6 py-5 font-semibold text-ink">
                                    {LABELS[row.canal] ?? row.canal}
                                </td>
                                <td className="px-6 py-5 text-ink">{fmt(row.totalIngresos)}</td>
                                <td className="px-6 py-5 text-ink">{fmt(row.totalCostos)}</td>
                                <td className="px-6 py-5">
                                    <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                                        style={{ color, backgroundColor: bg }}
                                    >
                                        {row.margen.toFixed(1)}% {arrow}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}