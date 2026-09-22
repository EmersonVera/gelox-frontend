import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { descargarExportacionPedido } from "../../../services/vozService";

// Vista para MODIFICAR_PEDIDO (RF53). No hay mockup dedicado en Figma (ver
// docs/T48_Instrucciones_Emerson.md): usa el mismo lenguaje visual de tarjeta
// de voz que VistaPedido.jsx (banner con degradado, badges, panel de
// acciones), con los colores y clases de DESIGN-tailwind.md.

const ACCION_INFO = {
  AGREGAR: { label: "Agregar", pill: "bg-success-bg text-success-fg" },
  ELIMINAR: { label: "Eliminar", pill: "bg-error-bg text-error-fg" },
  ACTUALIZAR: { label: "Actualizar", pill: "bg-amber-50 text-amber-700" },
};

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6.5" y="1.5" width="5" height="9" rx="2.5" />
      <path d="M3.5 8.5a5.5 5.5 0 0 0 11 0" />
      <path d="M9 14v2.5M6 16.5h6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="9.5" />
      <path d="M7 11.2l2.6 2.6L15 8.4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
      <path d="M10 2.5l8.5 14.7H1.5L10 2.5z" strokeLinejoin="round" />
      <path d="M10 8v3.5M10 14.2v.1" />
    </svg>
  );
}

function useCuentaRegresiva(expiraEnSegundos, activo) {
  const [restantes, setRestantes] = useState(expiraEnSegundos ?? null);
  const [expiraPrevio, setExpiraPrevio] = useState(expiraEnSegundos ?? null);

  // Reinicia el contador cuando llega una nueva expiración (nuevo comando de
  // voz), ajustando el estado durante el render en vez de en un efecto.
  if ((expiraEnSegundos ?? null) !== expiraPrevio) {
    setExpiraPrevio(expiraEnSegundos ?? null);
    setRestantes(expiraEnSegundos ?? null);
  }

  useEffect(() => {
    if (!activo || restantes === null || restantes <= 0) return;
    const id = setTimeout(() => setRestantes((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [activo, restantes]);

  return restantes;
}

export default function VistaModificarPedido({
  ok = true,
  datos,
  textoRespuesta,
  requiereConfirmacion,
  expiraEnSegundos,
  onConfirmar,
  onCancelar,
}) {
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState("");

  // useCuentaRegresiva debe llamarse siempre en el mismo orden (Rules of
  // Hooks), antes de los `return` tempranos de los flujos alterno/sin datos.
  const completado = !!datos?.exportUrl;
  const pendiente = ok && requiereConfirmacion && !completado && !cancelado;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  // Flujo alterno de RF53: no hay pedido pendiente o el producto no está en
  // el pedido. El backend solo trae textoRespuesta, sin botones que mostrar.
  if (!ok) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
          Asistente de Voz
        </p>
        <div className="bg-surface/60 border border-border rounded-2xl p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0">
            <WarningIcon />
          </div>
          <p className="text-sm text-ink pt-2">
            {textoRespuesta || "No se pudo modificar el pedido pendiente."}
          </p>
        </div>
      </div>
    );
  }

  if (!datos) {
    return <p className="text-sm text-muted">No hay datos de modificación para mostrar.</p>;
  }

  const { pedidoId, accion, producto, cantidadAnterior, cantidadNueva } = datos;
  const accionInfo = ACCION_INFO[accion] ?? { label: accion, pill: "bg-surface text-muted" };
  const numeroPedido = pedidoId ? pedidoId.slice(0, 8).toUpperCase() : "—";

  const handleConfirmar = () => {
    setConfirmando(true);
    onConfirmar?.();
  };

  const handleCancelar = () => {
    setCancelado(true);
    onCancelar?.();
  };

  const handleDescargar = async () => {
    if (!datos.exportUrl) return;
    setErrorDescarga("");
    setDescargando(true);
    try {
      await descargarExportacionPedido(datos.exportUrl);
    } catch {
      setErrorDescarga("No se pudo descargar el archivo. Intenta de nuevo.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
          Asistente de Voz
        </p>
        <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
          Modificar Pedido Pendiente
        </h1>
      </div>

      {/* Banner de voz — mismo patrón que VistaPedido.jsx */}
      {textoRespuesta && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/10 shadow-sm bg-gradient-to-r from-primary/[0.06] via-white to-amber-50/60 p-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary shadow-sm shadow-primary/30 flex items-center justify-center shrink-0">
              <MicIcon />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">
                Último comando reconocido
              </p>
              <p className="text-sm font-medium text-ink italic leading-relaxed">
                &ldquo;{textoRespuesta}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta del cambio */}
      <div className="bg-white border border-border rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Pedido #{numeroPedido}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${accionInfo.pill}`}>
            {accionInfo.label}
          </span>
        </div>
        <span className="font-display font-bold text-lg text-ink">{producto}</span>
        <div className="flex items-center gap-3 bg-surface/60 rounded-xl px-4 py-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Anterior</span>
            <span className="font-display font-bold text-lg text-ink">{cantidadAnterior}</span>
          </div>
          <span className="text-muted text-lg pb-3">→</span>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Nueva</span>
            <span className="font-display font-bold text-lg text-primary">{cantidadNueva}</span>
          </div>
        </div>
      </div>

      {/* Panel de acciones */}
      <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
        {completado ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-2 text-success-fg">
              <CheckCircleIcon />
              <span className="font-display font-bold text-sm">Pedido actualizado</span>
            </div>
            <div className="flex flex-col gap-1 items-start sm:items-end">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/inventarios/pedidos/${pedidoId}`)}
                  className="bg-white border border-border hover:bg-surface text-ink rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95"
                >
                  Ver pedido
                </button>
                <button
                  type="button"
                  onClick={handleDescargar}
                  disabled={descargando}
                  className="bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg shadow-primary/20 transition-all duration-200 active:scale-95"
                >
                  {descargando ? "Descargando…" : "Descargar Excel"}
                </button>
              </div>
              {errorDescarga && <p className="text-xs text-danger">{errorDescarga}</p>}
            </div>
          </div>
        ) : cancelado ? (
          <p className="text-sm text-muted">Modificación cancelada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={confirmando || expirado}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-2xl px-4 py-3.5 text-base font-bold shadow-lg shadow-primary/20 transition-all duration-200 active:scale-95"
            >
              {confirmando ? "Confirmando…" : "Confirmar Cambio"}
            </button>
            {pendiente && (
              <p className="text-xs text-muted text-center">
                {expirado ? "El tiempo para confirmar expiró." : `Expira en ${restantes}s`}
              </p>
            )}
            <button
              type="button"
              onClick={handleCancelar}
              disabled={confirmando}
              className="w-full bg-surface hover:bg-border disabled:opacity-60 text-ink rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
