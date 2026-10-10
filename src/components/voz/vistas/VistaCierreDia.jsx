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

  // Pensada para el panel del asistente (320 px): filas en vez de tarjetas en
  // columnas. Las clases sm: no sirven aquí porque miden la ventana, no el panel.
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
          Asistente de Voz
        </p>
        <h1 className="font-display font-bold text-lg leading-tight text-ink tracking-tight">
          Resumen del Cierre del Día
        </h1>
        {periodo && <p className="text-xs text-muted mt-0.5">{periodo}</p>}
      </div>

      <div className="bg-primary rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
          <TotalIcon />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            Total del Día
          </span>
          <span className="font-display font-bold text-xl text-white leading-tight truncate">
            {formatoCOP(totalIngresos)}
          </span>
          <span className="text-xs text-white/70">
            {totalTransacciones ?? "—"} transacciones
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border divide-y divide-border">
        {CANALES.map(({ key, nombre, icono: Icono }) => (
          <div key={key} className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center shrink-0">
              <Icono />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {nombre}
              </span>
              <span className="text-sm font-semibold text-ink truncate">
                {formatoCOP(ingresosPorCanal[key])}
              </span>
            </div>
            <VariacionBadge valor={variacionPorCanal[key]} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-sm text-ink">Conciliación de Efectivo</h3>
          <BadgeConciliacion
            estado={estadoConciliacion}
            diferencia={conciliacion?.diferenciaTotal}
          />
        </div>
        {conciliacion ? (
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Efectivo esperado</dt>
              <dd className="font-semibold text-ink">{formatoCOP(conciliacion.montoCalculadoTotal)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Efectivo reportado</dt>
              <dd className="font-semibold text-ink">{formatoCOP(conciliacion.montoFisicoTotal)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Diferencia neta</dt>
              <dd className={`font-semibold ${conciliacion.diferenciaTotal === 0 ? "text-success-fg" : "text-danger"}`}>
                {formatoCOP(conciliacion.diferenciaTotal)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-muted">
            Aún no se ha registrado el dinero físico del día.
          </p>
        )}
      </div>
    </div>
  );
}
