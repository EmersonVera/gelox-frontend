import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axiosConfig";
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

  const navigate = useNavigate();
  const [conciliacionLocal, setConciliacionLocal] = useState(conciliacion || null);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [montos, setMontos] = useState({ ventanilla: "", rural: "", comerciantes: "" });
  const [enviando, setEnviando] = useState(false);
  const [errorCierre, setErrorCierre] = useState(null);

  const totalFisico = (Number(montos.ventanilla) || 0) + (Number(montos.rural) || 0) + (Number(montos.comerciantes) || 0);

  const handleSubmitFisico = async (e) => {
    e?.preventDefault();
    if (montos.ventanilla === "" || montos.rural === "" || montos.comerciantes === "") {
      setErrorCierre("Debes ingresar los montos de los tres canales.");
      return;
    }
    setEnviando(true);
    setErrorCierre(null);
    try {
      const v = Number(montos.ventanilla) || 0;
      const r = Number(montos.rural) || 0;
      const c = Number(montos.comerciantes) || 0;
      const res = await api.post("/api/cierre-caja", {
        montoFisicoVentanilla: v,
        montoFisicoRural: r,
        montoFisicoComerciantes: c,
      });
      setConciliacionLocal(res.data);
      setMostrandoFormulario(false);
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorCierre("El cierre para hoy ya había sido registrado.");
      } else {
        const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Error al registrar.";
        setErrorCierre(msg);
      }
    } finally {
      setEnviando(false);
    }
  };

  const conciliacionActiva = conciliacionLocal || conciliacion;
  const estadoConciliacion = !conciliacionActiva
    ? "pendiente"
    : conciliacionActiva.tieneDiferencias
      ? "diferencia"
      : "sin-diferencias";

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
            diferencia={conciliacionActiva?.diferenciaTotal}
          />
        </div>

        {conciliacionActiva ? (
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Efectivo esperado</dt>
              <dd className="font-semibold text-ink">{formatoCOP(conciliacionActiva.montoCalculadoTotal)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Efectivo reportado</dt>
              <dd className="font-semibold text-ink">{formatoCOP(conciliacionActiva.montoFisicoTotal)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Diferencia neta</dt>
              <dd className={`font-semibold ${conciliacionActiva.diferenciaTotal === 0 ? "text-success-fg" : "text-danger"}`}>
                {formatoCOP(conciliacionActiva.diferenciaTotal)}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs text-muted">
              Aún no se ha registrado el dinero físico del día.
            </p>

            {!mostrandoFormulario ? (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setMostrandoFormulario(true)}
                  className="w-full bg-primary hover:bg-primary-dark text-white rounded-lg py-2 text-xs font-semibold transition-colors"
                >
                  + Ingresar dinero físico contado
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/cierre-caja")}
                  className="w-full bg-surface hover:bg-border text-ink rounded-lg py-1.5 text-xs font-medium transition-colors"
                >
                  Ir a pantalla de Cierre de Caja
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFisico} className="flex flex-col gap-2 bg-surface/50 p-2.5 rounded-xl border border-border">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink">
                  Dinero físico por canal
                </p>

                <div className="flex flex-col gap-1.5">
                  <div>
                    <label className="text-[11px] text-muted block mb-0.5">Ventanilla ($)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={montos.ventanilla}
                      onChange={(e) => setMontos({ ...montos, ventanilla: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-0.5">Rural ($)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={montos.rural}
                      onChange={(e) => setMontos({ ...montos, rural: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-0.5">Comerciantes ($)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={montos.comerciantes}
                      onChange={(e) => setMontos({ ...montos, comerciantes: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white text-ink focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-border">
                  <span className="text-muted">Total contado:</span>
                  <span className="text-ink">{formatoCOP(totalFisico)}</span>
                </div>

                {errorCierre && (
                  <p className="text-[11px] text-danger">{errorCierre}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-1.5 text-xs font-semibold transition-colors"
                  >
                    {enviando ? "Guardando…" : "Registrar Cierre"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrandoFormulario(false)}
                    disabled={enviando}
                    className="bg-surface hover:bg-border text-ink rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
