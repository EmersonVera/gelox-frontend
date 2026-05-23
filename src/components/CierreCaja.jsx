import { useState, useEffect } from "react";
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

const hoy = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

export default function CierreCaja({ efectivoEsperado = 0 }) {
  const [montos, setMontos] = useState({
    ventanilla: "",
    rural: "",
    comerciantes: "",
  });
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [exitoso, setExitoso] = useState(false);
  const [erroresInput, setErroresInput] = useState({
    ventanilla: false,
    rural: false,
    comerciantes: false,
  });
  const [cierreExistente, setCierreExistente] = useState(false);
  const [cargandoEstado, setCargandoEstado] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargandoEstado(true);
    api
      .get(`/api/cierre-caja/${hoy}`)
      .then(() => {
        if (!cancelado) setCierreExistente(true);
      })
      .catch((err) => {
        // 404 = no existe todavía, cualquier otro error lo ignoramos
        if (!cancelado) setCierreExistente(false);
      })
      .finally(() => {
        if (!cancelado) setCargandoEstado(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const totalFisico = CANALES.reduce(
    (sum, c) => sum + parseMonto(montos[c.key]),
    0,
  );
  const diferencia = totalFisico - efectivoEsperado;
  const todosLlenos = CANALES.every((c) => montos[c.key] !== "");

  const hayFormatoInvalido = Object.values(erroresInput).some(Boolean);

  const handleChange = (key, e) => {
    setExitoso(false);
    setError("");
    const badInput = e.target.validity.badInput;
    setErroresInput((prev) => ({ ...prev, [key]: badInput }));
    setMontos((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleProcesar = async () => {
    setError("");

    // Validar formato inválido primero
    if (hayFormatoInvalido) {
      setError("Corrige los valores con formato inválido antes de continuar.");
      return;
    }

    // Validar que todos los campos estén llenos
    const algonVacio = CANALES.some((c) => montos[c.key] === "");
    if (algonVacio) {
      setError("Debes ingresar los montos de los tres canales antes de procesar el cierre.");
      return;
    }

    setProcesando(true);
    try {
      await api.post("/api/cierre-caja", {
        montoFisicoVentanilla: parseMonto(montos.ventanilla),
        montoFisicoRural: parseMonto(montos.rural),
        montoFisicoComerciantes: parseMonto(montos.comerciantes),
      });
      setExitoso(true);
      setCierreExistente(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.message ??
        "Error al registrar el cierre.";
      setError(msg);
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
              cierreExistente
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
              disabled={cierreExistente || cargandoEstado}
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
      {cargandoEstado ? (
        <div className="rounded-xl px-4 py-2.5 text-sm font-medium border border-border bg-surface text-muted animate-pulse">
          Verificando cierre de hoy…
        </div>
      ) : cierreExistente ? (
        <div className="rounded-xl px-4 py-3 text-sm font-medium border border-green-200 bg-green-50 text-green-700 flex items-center gap-2">
          <span className="text-base">✓</span>
          <span>Ya se realizó el cierre de caja de hoy.</span>
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

      {/* Botón — se oculta si ya hay cierre */}
      {!cierreExistente && (
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
