import { formatoCOP, formatoPct } from "../formato";

// Vista de solo lectura para CONSULTAR_FINANZAS (tipo "ventas" o "ganancia").
// No hay mockup propio en Figma para RF50 (ver docs/T46_Instrucciones_Emerson.md).
// Sigue el mismo lenguaje visual que las páginas ya existentes del mismo dominio:
// las tarjetas de indicadores replican `KpiCard` de src/pages/administrador/Reportes.jsx
// y la tabla por canal replica src/components/reportes/tablarentabilidadcanal.jsx
// (misma forma de datos: canal, totalIngresos, totalCostos, margen).

const CANALES = [
  { key: "ventanilla", label: "Ventanilla" },
  { key: "rural", label: "Rural" },
  { key: "comerciantes", label: "Comerciantes" },
];

function KpiCard({ label, value, colorClass = "text-ink" }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3.5 flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className={`font-display text-xl font-bold truncate ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}

function BarraCanal({ label, valor, total }) {
  const totalNum = Number(total) || 0;
  const valorNum = Number(valor) || 0;
  const pct = totalNum > 0 ? Math.min(100, Math.round((valorNum / totalNum) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted font-medium">{label}</span>
        <span className="text-ink font-semibold">{formatoCOP(valor)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Mismos umbrales que TablaRentabilidadCanal.jsx, con los tokens de color del proyecto.
function estiloMargen(margen) {
  if (margen == null) return { pill: "bg-surface text-muted", arrow: "" };
  if (margen >= 30) return { pill: "bg-success-bg text-success-fg", arrow: "↑" };
  if (margen >= 10) return { pill: "bg-amber-50 text-amber-700", arrow: "—" };
  return { pill: "bg-error-bg text-error-fg", arrow: "↓" };
}

export default function VistaFinanzas({ datos }) {
  if (!datos) {
    return (
      <p className="text-sm text-muted">
        No hay datos financieros para mostrar.
      </p>
    );
  }

  const {
    tipo,
    periodo,
    ingresosVentanilla,
    ingresosRural,
    ingresosComerciantes,
    ingresosTotales,
    utilidadNeta,
    margenGanancia,
    canales = [],
  } = datos;

  const utilidadColor =
    utilidadNeta == null ? "text-ink" : utilidadNeta < 0 ? "text-danger" : "text-success-fg";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">
          Asistente de Voz
        </p>
        <h1 className="font-display font-bold text-lg text-ink tracking-tight">
          Indicadores de Ventas y Finanzas
        </h1>
        {periodo && <p className="text-xs text-muted mt-0.5">{periodo}</p>}
      </div>

      {/* Ingresos totales / Utilidad neta / Margen */}
      <div className="grid grid-cols-1 gap-2.5">
        <KpiCard label="Ingresos Totales" value={formatoCOP(ingresosTotales)} />
        <KpiCard label="Utilidad Neta" value={formatoCOP(utilidadNeta)} colorClass={utilidadColor} />
        <KpiCard label="Margen de Ganancia" value={formatoPct(margenGanancia)} />
      </div>

      {/* Desglose por canal */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3">
        <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
          Desglose por Canal
        </h3>
        {CANALES.map(({ key, label }) => (
          <BarraCanal
            key={key}
            label={label}
            valor={
              {
                ventanilla: ingresosVentanilla,
                rural: ingresosRural,
                comerciantes: ingresosComerciantes,
              }[key]
            }
            total={ingresosTotales}
          />
        ))}
      </div>

      {/* Ingresos, costos y ganancia por canal — solo tipo "ganancia".
          Misma tabla que TablaRentabilidadCanal.jsx, con una columna de Ganancia. */}
      {tipo === "ganancia" && canales.length > 0 && (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-3.5 pt-3 pb-2.5 border-b border-border">
            <h2 className="font-display font-semibold text-ink text-sm">
              Rentabilidad por Canal
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Canal", "Ingresos", "Costos", "Ganancia", "Margen"].map((h) => (
                    <th
                      key={h}
                      className="px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {canales.map((c, i) => {
                  const sinDato = c.totalIngresos == null && c.totalCostos == null;
                  const ganancia = sinDato
                    ? null
                    : (Number(c.totalIngresos) || 0) - (Number(c.totalCostos) || 0);
                  const { pill, arrow } = estiloMargen(c.margen);
                  return (
                    <tr
                      key={c.canal}
                      className={`border-b border-border transition-colors hover:bg-surface ${
                        i === canales.length - 1 ? "border-none" : ""
                      }`}
                    >
                      <td className="px-2.5 py-2 font-semibold text-ink whitespace-nowrap">{c.canal}</td>
                      <td className="px-2.5 py-2 text-ink whitespace-nowrap">{formatoCOP(c.totalIngresos)}</td>
                      <td className="px-2.5 py-2 text-ink whitespace-nowrap">{formatoCOP(c.totalCostos)}</td>
                      <td className="px-2.5 py-2 text-ink whitespace-nowrap">{formatoCOP(ganancia)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pill}`}
                        >
                          {formatoPct(c.margen)} {arrow}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
