import { useEffect, useState } from "react";
import { descargarExportacionPedido } from "../../../services/vozService";

// Vista para GENERAR_PEDIDO (RF52). Sigue el layout y el detalle visual del
// mockup de Figma "Hacer pedido a nutresa por voz" (node 665:189, banner de
// voz 665:293, carrito 665:447) y el mismo esquema de dos columnas de
// src/pages/inventarios/GenerarPedido.jsx (productos a la izquierda, carrito
// fijo a la derecha), traducido a los tokens de DESIGN-tailwind.md. No se
// construye búsqueda de catálogo ni "agregar producto": los ítems ya vienen
// resueltos por la voz, así que la izquierda solo los muestra (no se eligen).
//
// Los steppers de Caja/Unidad son de SOLO LECTURA: el contrato actual de
// POST /api/voz/confirmar no acepta cantidades editadas (ver aviso técnico en
// docs/T48_Instrucciones_Emerson.md), así que no se ofrece edición inline.

function PackageIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M2 6.5l8-4 8 4-8 4-8-4z" />
      <path d="M2 6.5v7l8 4 8-4v-7" />
      <path d="M10 10.5v7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6.5" y="1.5" width="5" height="9" rx="2.5" />
      <path d="M3.5 8.5a5.5 5.5 0 0 0 11 0" />
      <path d="M9 14v2.5M6 16.5h6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M1 1h2l2 11h10l2-7H4" />
      <circle cx="6.5" cy="16" r="1.2" />
      <circle cx="13" cy="16" r="1.2" />
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

// Stepper de solo lectura: mismo lenguaje visual de un control de cantidad,
// sin handlers (no editable), ya que el backend no soporta cantidades editadas.
function StepperSoloLectura({ label, value }) {
  return (
    <div className="flex items-center justify-between bg-surface rounded-lg px-3 py-1.5">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 flex items-center justify-center font-bold text-[12px] text-muted/50">
          −
        </span>
        <span className="font-display font-bold text-[13px] text-ink w-4 text-center">{value}</span>
        <span className="w-5 h-5 flex items-center justify-center font-bold text-[12px] text-muted/50">
          +
        </span>
      </div>
    </div>
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

export default function VistaPedido({
  datos,
  textoRespuesta,
  requiereConfirmacion,
  expiraEnSegundos,
  onConfirmar,
  onCancelar,
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState("");

  const completado = !!(datos?.pedidoId || datos?.exportUrl);
  const pendiente = requiereConfirmacion && !completado && !cancelado;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  if (!datos) {
    return <p className="text-sm text-muted">No hay datos de pedido para mostrar.</p>;
  }

  const items = datos.items ?? [];
  const totalCajas = items.reduce((s, i) => s + (Number(i.cantidadCajas) || 0), 0);
  const totalUnidades = items.reduce((s, i) => s + (Number(i.cantidadUnidades) || 0), 0);

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
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-bold text-3xl text-ink tracking-tight">
            Generar Pedido a Proveedor
          </h1>
          {!completado && (
            <span className="inline-flex items-center gap-1.5 bg-success-bg text-success-fg px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-success-fg" />
              Borrador Generado por Voz
            </span>
          )}
        </div>
      </div>

      {/* Banner de voz — replica el patrón "Active Voice Log Banner" (node 665:293) */}
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

      {/* Productos a la izquierda / Carrito a la derecha — mismo esquema que GenerarPedido.jsx */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Productos (izquierda) ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
          <h3 className="font-display font-bold text-sm text-ink">Productos del Pedido</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item.productoId}
                className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col"
              >
                <div className="h-24 bg-primary/5 flex items-center justify-center">
                  <PackageIcon size={30} />
                </div>
                <div className="p-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display font-bold text-sm text-ink truncate">
                      {item.nombre}
                    </span>
                    <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                      Voz
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {[
                      item.cantidadCajas ? `${item.cantidadCajas} cajas` : null,
                      item.cantidadUnidades ? `${item.cantidadUnidades} unidades` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin cantidad"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Carrito (derecha, fijo) ── */}
        <div className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-8">
          <div className="bg-white border border-border rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CartIcon />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-ink leading-tight">
                    Carrito de Pedido
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-success-fg font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-fg shrink-0" />
                    Dictado por Voz
                  </p>
                </div>
              </div>
              <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
                {items.length} ÍTEMS
              </span>
            </div>

            {/* Ítems del carrito con steppers de solo lectura */}
            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-0.5">
              {items.map((item) => (
                <div key={item.productoId} className="flex flex-col gap-2 pb-3 border-b border-border last:border-none last:pb-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <PackageIcon size={16} />
                    </div>
                    <span className="font-display font-semibold text-[13px] text-ink truncate flex-1 min-w-0">
                      {item.nombre}
                    </span>
                  </div>
                  <StepperSoloLectura label="Caja" value={item.cantidadCajas ?? 0} />
                  <StepperSoloLectura label="Unidad" value={item.cantidadUnidades ?? 0} />
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="bg-surface rounded-lg p-3 flex items-center">
              <div className="flex-1 text-center">
                <p className="font-display font-extrabold text-xl text-ink leading-none">{totalCajas}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Cajas</p>
              </div>
              <div className="w-px h-8 bg-border shrink-0" />
              <div className="flex-1 text-center">
                <p className="font-display font-extrabold text-xl text-ink leading-none">{totalUnidades}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mt-1">Unidades</p>
              </div>
            </div>

            {/* Acciones */}
            {completado ? (
              <div className="bg-success-bg border border-success-fg/20 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-success-fg">
                  <CheckCircleIcon />
                  <span className="font-display font-bold text-sm">Pedido registrado</span>
                </div>
                <button
                  type="button"
                  onClick={handleDescargar}
                  disabled={descargando}
                  className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg shadow-primary/20 transition-all duration-200 active:scale-95"
                >
                  {descargando ? "Descargando…" : "Descargar Excel"}
                </button>
                {errorDescarga && <p className="text-xs text-danger">{errorDescarga}</p>}
              </div>
            ) : cancelado ? (
              <p className="text-sm text-muted text-center">Pedido cancelado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={confirmando || expirado}
                  className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-2xl px-4 py-3.5 text-base font-bold shadow-lg shadow-primary/20 transition-all duration-200 active:scale-95"
                >
                  {confirmando ? "Confirmando…" : "Confirmar Pedido"}
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
      </div>
    </div>
  );
}
