import { formatoCOP, formatoPct } from "../formato";

// Vista de solo lectura para CONSULTAR_FINANZAS (tipo "cierre"). RF51 es
// puramente informativa: la voz nunca cierra la caja (T45-BE4), por eso no
// hay botón "Cerrar caja" aunque el mockup de Figma (node 651:718) lo incluya
// para el flujo manual de CierreCaja.jsx.
//
// Sigue el mismo lenguaje visual que src/pages/ventas/ReporteVentasDia.jsx
// (RF40-42, mismo dominio: ingresos por canal + variación + total del día) y
// que src/pages/administrador/DetalleCierre.jsx (bloque de conciliación).

function StoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <rect x="1" y="5" width="16" height="12" rx="2" />
      <path d="M1 9h16M6 9v8M12 9v8" />
      <path d="M6 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <rect x="1" y="6" width="16" height="9" rx="2" />
      <path d="M1 10h16" />
      <circle cx="5" cy="15" r="1.5" strokeWidth="1.2" />
      <circle cx="13" cy="15" r="1.5" strokeWidth="1.2" />
      <path d="M5 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ComerciantesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M2 7h14l-1.5 9H3.5L2 7z" strokeLinejoin="round" />
      <path d="M1 4h16" strokeLinecap="round" />
      <path d="M6 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}

function TotalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round">
      <rect x="1" y="4" width="16" height="10" rx="2" />
      <circle cx="9" cy="9" r="2.5" />
      <path d="M1 7h2M15 7h2M1 11h2M15 11h2" />
    </svg>
  );
}

const CANALES = [
  { key: "ventanilla", nombre: "Ventanilla", icono: StoreIcon },
  { key: "rural", nombre: "Rural", icono: TruckIcon },
  { key: "comerciantes", nombre: "Comerciantes", icono: ComerciantesIcon },
];

// Misma pastilla de color que VariacionBadge en ReporteVentasDia.jsx, con las
// flechas ▲/▼ que pide T46-FE4 (▲ o ▼; sin dato → "—").
function VariacionBadge({ valor }) {
  if (valor === null || valor === undefined) {
    return (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-[6px] bg-surface text-muted">
        —
      </span>
    );
  }
  const positivo = Number(valor) >= 0;
  return (
    <span
      className={`text-xs font-semibold px-1.5 py-0.5 rounded-[6px] ${
        positivo ? "bg-success-bg text-success-fg" : "bg-error-bg text-error-fg"
      }`}
    >
      {positivo ? "▲" : "▼"} {formatoPct(Math.abs(valor))}
    </span>
  );
}

function BadgeConciliacion({ estado, diferencia }) {
  if (estado === "pendiente") {
    return (
      <span className="bg-surface text-muted px-3 py-1 rounded-full text-xs font-semibold shrink-0">
        Pendiente
      </span>
    );
  }
  if (estado === "diferencia") {
    return (
      <span className="bg-error-bg text-error-fg px-3 py-1 rounded-full text-xs font-semibold shrink-0">
        Diferencia de {formatoCOP(Math.abs(diferencia))}
      </span>
    );
  }
  return (
    <span className="bg-success-bg text-success-fg px-3 py-1 rounded-full text-xs font-semibold shrink-0">
      Sin diferencias
    </span>
  );
}

export default function VistaCierreDia({ datos }) {
  if (!datos) {
    return (
      <p className="text-sm text-muted">
        No hay datos de cierre para mostrar.
      </p>
    );
  }

  const {
    periodo,
    ingresosVentanilla,
    ingresosRural,
    ingresosComerciantes,
    totalIngresos,
    totalTransacciones,
    variacionVentanilla,
    variacionRural,
    variacionComerciantes,
    conciliacion,
  } = datos;

  const ingresosPorCanal = {
    ventanilla: ingresosVentanilla,
    rural: ingresosRural,
    comerciantes: ingresosComerciantes,
  };
  const variacionPorCanal = {
    ventanilla: variacionVentanilla,
    rural: variacionRural,
    comerciantes: variacionComerciantes,
  };

  const estadoConciliacion = !conciliacion
    ? "pendiente"
    : conciliacion.tieneDiferencias
      ? "diferencia"
      : "sin-diferencias";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
          Asistente de Voz
        </p>
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
          Resumen Ejecutivo del Cierre del Día
        </h1>
        {periodo && <p className="text-sm text-muted mt-1">{periodo}</p>}
      </div>

      {/* Canales + total del día — mismo layout que ReporteVentasDia.jsx (RF40-42) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {CANALES.map(({ key, nombre, icono: Icono }) => (
          <div
            key={key}
            className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
                <Icono />
              </div>
              <VariacionBadge valor={variacionPorCanal[key]} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted mt-4">
              {nombre}
            </span>
            <span className="font-display font-bold text-[22px] text-ink mt-1">
              {formatoCOP(ingresosPorCanal[key])}
            </span>
          </div>
        ))}

        <div className="bg-primary rounded-xl p-6 flex flex-col">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <TotalIcon />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 mt-4">
            Total del Día
          </span>
          <span className="font-display font-bold text-[28px] text-white mt-1 leading-[34px]">
            {formatoCOP(totalIngresos)}
          </span>
          <span className="text-xs text-white/60 mt-1">
            {totalTransacciones ?? "—"} transacciones
          </span>
        </div>
      </div>

      {/* Conciliación y Cuadre de Efectivo — mismo bloque que DetalleCierre.jsx */}
      <div className="bg-white rounded-xl border border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-bold text-sm text-ink">
            Conciliación y Cuadre de Efectivo
          </h3>
          <BadgeConciliacion
            estado={estadoConciliacion}
            diferencia={conciliacion?.diferenciaTotal}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted">
              Efectivo Esperado
            </span>
            <span className="text-sm font-semibold text-ink">
              {conciliacion ? formatoCOP(conciliacion.montoCalculadoTotal) : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted">
              Efectivo Reportado
            </span>
            <span className="text-sm font-semibold text-ink">
              {conciliacion ? formatoCOP(conciliacion.montoFisicoTotal) : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted">
              Diferencia Neta
            </span>
            <span
              className={`text-sm font-semibold ${
                !conciliacion
                  ? "text-muted"
                  : conciliacion.diferenciaTotal === 0
                    ? "text-success-fg"
                    : "text-danger"
              }`}
            >
              {conciliacion ? formatoCOP(conciliacion.diferenciaTotal) : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
