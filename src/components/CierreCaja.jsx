import { useState, useEffect, useCallback } from "react";
import api from "../api/axiosConfig";

function CajaIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 7l1-4h18l1 4" />
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 12H8" />
      <path d="M12 12v4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

const fmt = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n));

const parseMonto = (v) => parseFloat(String(v).trim()) || 0;

const CANALES = [
  { key: "ventanilla", label: "Ventanilla" },
  { key: "rural", label: "Rural" },
  { key: "comerciantes", label: "Comerciantes" },
];

/** Convierte una Date a "YYYY-MM-DD" usando hora local (evita desfase UTC). */
function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Retorna "YYYY-MM-DD" de hace N días. */
function isoHaceNDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalISO(d);
}

const HOY = toLocalISO(new Date());
const AYER = isoHaceNDias(1);

/** Etiqueta legible para la fecha seleccionada. */
function etiquetaFecha(iso) {
  if (iso === HOY) return "hoy";
  if (iso === AYER) return "ayer";
  // Otra fecha futura/pasada (no debería ocurrir con la restricción del picker)
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const MONTOS_VACIOS = { ventanilla: "", rural: "", comerciantes: "" };
const ERRORES_VACIOS = { ventanilla: false, rural: false, comerciantes: false };

export default function CierreCaja({ efectivoEsperado = 0 }) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(HOY);

  const [montos, setMontos] = useState(MONTOS_VACIOS);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exitoso, setExitoso] = useState(false);
  const [erroresInput, setErroresInput] = useState(ERRORES_VACIOS);
  const [cierreExistente, setCierreExistente] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [errorVerificacion, setErrorVerificacion] = useState("");

  // ¿La fecha elegida permite operar? Solo hoy y ayer.
  const esFechaPermitida = fechaSeleccionada === HOY || fechaSeleccionada === AYER;

  // Verificar si ya existe cierre para la fecha seleccionada
  useEffect(() => {
    // Si la fecha no es válida para operar, no hacemos consulta.
    if (!esFechaPermitida) {
      setCierreExistente(false);
      setCargandoEstado(false);
      setErrorVerificacion("");
      return;
    }

    let cancelado = false;
    setCargandoEstado(true);
    setErrorVerificacion("");
    setCierreExistente(false);

    api
      .get("/api/cierre-caja", {
        params: { desde: fechaSeleccionada, hasta: fechaSeleccionada },
      })
      .then((res) => {
        if (!cancelado) {
          // El backend devuelve { cierres: [...], total, page, totalPages }
          const items =
            res.data?.cierres ?? res.data?.content ?? res.data?.items ?? [];
          const hayRegistros = Array.isArray(items)
            ? items.length > 0
            : (res.data?.total ?? 0) > 0;
          setCierreExistente(hayRegistros);
        }
      })
      .catch(() => {
        if (cancelado) return;
        // Cualquier error → bloquear por seguridad para evitar doble cierre.
        setCierreExistente(true);
        setErrorVerificacion(
          "No se pudo verificar el estado del cierre. Recarga la página antes de continuar."
        );
      })
      .finally(() => {
        if (!cancelado) setCargandoEstado(false);
      });

    return () => {
      cancelado = true;
    };
  }, [fechaSeleccionada, esFechaPermitida]);

  // Al cambiar de fecha, limpiar el formulario
  const handleCambioFecha = useCallback((e) => {
    setFechaSeleccionada(e.target.value);
    setMontos(MONTOS_VACIOS);
    setErroresInput(ERRORES_VACIOS);
    setError("");
    setExitoso(false);
    setCargandoEstado(true);
  }, []);

  const totalFisico = CANALES.reduce(
    (sum, c) => sum + parseMonto(montos[c.key]),
    0
  );
  const diferencia = totalFisico - efectivoEsperado;
  const todosLlenos = CANALES.every((c) => montos[c.key] !== "");
  const hayFormatoInvalido = Object.values(erroresInput).some(Boolean);

  // Un input está bloqueado si: cierre ya existe, se está cargando, o la fecha no es permitida
  const inputsBloqueados = cierreExistente || cargandoEstado || !esFechaPermitida;

  const handleChange = (key, e) => {
    setExitoso(false);
    setError("");
    const badInput = e.target.validity.badInput;
    setErroresInput((prev) => ({ ...prev, [key]: badInput }));
    setMontos((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleProcesar = async () => {
    setError("");

    if (!esFechaPermitida) return; // Guardia extra

    if (hayFormatoInvalido) {
      setError("Corrige los valores con formato inválido antes de continuar.");
      return;
    }

    const algonVacio = CANALES.some((c) => montos[c.key] === "");
    if (algonVacio) {
      setError(
        "Debes ingresar los montos de los tres canales antes de procesar el cierre."
      );
      return;
    }

    setProcesando(true);
    try {
      // Si es ayer, pasar la fecha como query param al backend
      const params =
        fechaSeleccionada !== HOY ? { fecha: fechaSeleccionada } : undefined;

      await api.post(
        "/api/cierre-caja",
        {
          montoFisicoVentanilla: parseMonto(montos.ventanilla),
          montoFisicoRural: parseMonto(montos.rural),
          montoFisicoComerciantes: parseMonto(montos.comerciantes),
        },
        { params }
      );
      setExitoso(true);
      setCierreExistente(true);
    } catch (err) {
      // 409 → el cierre ya existe; tratar como éxito y mostrar el banner verde
      if (err.response?.status === 409) {
        setExitoso(true);
        setCierreExistente(true);
      } else {
        const msg =
          err.response?.data?.error ??
          err.response?.data?.message ??
          err.message ??
          "Error al registrar el cierre.";
        setError(msg);
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
      {/* Icono + título */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <CajaIcon />
        </div>
        <div>
          <h2 className="font-display font-bold text-sm text-ink leading-tight">
            Cierre de Caja Diario
          </h2>
          <p className="text-xs text-muted leading-snug mt-0.5">
            Reconciliación de efectivo al cierre del día.
          </p>
        </div>
      </div>

      {/* Efectivo esperado total — solo lectura */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Total Esperado (sistema)
        </label>
        <div className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink bg-surface">
          {fmt(efectivoEsperado)}
        </div>
      </div>

      {/* Inputs por canal */}
      {CANALES.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Efectivo Físico — {label}
          </label>
          <div
            className={`flex items-center border rounded-xl overflow-hidden transition-all duration-200 ${
              inputsBloqueados
                ? "border-border bg-surface"
                : erroresInput[key]
                  ? "border-danger bg-error-bg ring-2 ring-danger/20"
                  : "bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 border-border"
            }`}
          >
            <span
              className={`pl-4 font-bold text-sm ${erroresInput[key] ? "text-error-fg" : "text-primary"}`}
            >
              $
            </span>
            <input
              type="number"
              min="0"
              value={montos[key]}
              onChange={(e) => handleChange(key, e)}
              disabled={inputsBloqueados}
              className="flex-1 px-2 py-2.5 text-sm text-ink outline-none bg-transparent placeholder:text-muted disabled:cursor-not-allowed disabled:text-muted"
              placeholder="0"
            />
          </div>
          {erroresInput[key] && (
            <p className="text-[11px] text-error-fg font-medium flex items-center gap-1 px-1">
              <span>⚠</span> Valor inválido. Ingresa solo números enteros (sin símbolos ni letras).
            </p>
          )}
        </div>
      ))}

      {/* Total físico ingresado */}
      <div className="flex justify-between items-center text-sm px-1">
        <span className="text-muted font-medium">Total físico ingresado</span>
        <span className="font-bold text-ink">
          {todosLlenos ? fmt(totalFisico) : "—"}
        </span>
      </div>

      {/* Diferencia / estado del cierre */}
      {!esFechaPermitida ? (
        /* Fecha fuera de rango → banner informativo neutro */
        <div className="rounded-xl px-4 py-3 text-sm font-medium border border-border bg-surface text-muted flex items-center gap-2">
          <span className="text-base">🔒</span>
          <span>Solo puedes registrar el cierre para hoy o el día anterior.</span>
        </div>
      ) : cargandoEstado ? (
        <div className="rounded-xl px-4 py-2.5 text-sm font-medium border border-border bg-surface text-muted animate-pulse">
          Verificando cierre de {etiquetaFecha(fechaSeleccionada)}…
        </div>
      ) : errorVerificacion ? (
        <div className="rounded-xl px-4 py-3 text-sm font-medium border border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-2">
          <span className="text-base">⚠</span>
          <span>{errorVerificacion}</span>
        </div>
      ) : cierreExistente ? (
        <div className="rounded-xl px-4 py-3 text-sm font-medium border border-green-200 bg-green-50 text-green-700 flex items-center gap-2">
          <span className="text-base">✓</span>
          <span>
            Ya se realizó el cierre de caja para{" "}
            {etiquetaFecha(fechaSeleccionada)}.
          </span>
        </div>
      ) : (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm font-medium border transition-colors ${
            diferencia === 0
              ? "bg-surface border-border text-muted"
              : diferencia > 0
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-error-bg border-danger/20 text-error-fg"
          }`}
        >
          {diferencia === 0
            ? "Sin diferencia: "
            : diferencia > 0
              ? "Sobrante: "
              : "Faltante: "}
          <span className="font-bold">{fmt(Math.abs(diferencia))}</span>
        </div>
      )}

      {/* Mensajes de error */}
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Botón — se oculta si ya hay cierre o fecha no permitida */}
      {esFechaPermitida && !cierreExistente && (
        <button
          type="button"
          onClick={handleProcesar}
          disabled={procesando || cargandoEstado || hayFormatoInvalido}
          className="w-full bg-ink hover:bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-semibold font-display transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {procesando ? "Procesando…" : "Procesar Cierre de Caja"}
        </button>
      )}
    </div>
  );
}
