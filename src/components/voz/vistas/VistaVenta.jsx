import { useState } from 'react';
import { formatoCOP } from '../formato';

/**
 * Vista para REGISTRAR_VENTA (RF41, T42). A diferencia de VistaPedido /
 * VistaModificarPedido (que llaman confirmarComando directo), acá el
 * confirmar/cancelar se delega a {onConfirmar, onCancelar}: el hook
 * useAsistenteVoz (T42-FE2) también puede resolver la misma confirmación
 * por voz ("confirmar"/"cancelar" dichos mientras el panel está abierto),
 * así que la llamada a confirmarComando vive en un solo lugar (el hook) y
 * evita que un clic y una palabra hablada casi simultáneos disparen dos
 * confirmaciones para el mismo comandoId.
 *
 * Sin límite de tiempo: la venta queda pendiente hasta que la persona diga
 * "confirmar"/"cancelar" o toque un botón — no se cancela sola (decisión de
 * producto; el hook ya no tiene un timeout de confirmación).
 */

const CANAL_LABEL = {
  VENTANILLA: 'Ventanilla',
  RURAL: 'Rural',
};

function resumenCantidad(item) {
  const partes = [];
  if (item.cantidadCajas) partes.push(`${item.cantidadCajas} cj`);
  if (item.cantidadUnidades) partes.push(`${item.cantidadUnidades} un`);
  return partes.join(' · ') || '—';
}

export default function VistaVenta({ respuesta, onConfirmar, onCancelar }) {
  const [enCurso, setEnCurso] = useState(false);
  const { datos, textoRespuesta, requiereConfirmacion } = respuesta ?? {};

  const pendiente = !!requiereConfirmacion;

  if (!datos) {
    return (
      <p className="text-[13px] text-ink leading-snug">
        {textoRespuesta || 'No hay datos de venta para mostrar.'}
      </p>
    );
  }

  const { canal, items = [], destinatario, costoEnvio, total, metodoPago, ventaId } = datos;
  const esRural = canal === 'RURAL';
  const completado = !pendiente && !!ventaId;

  const handleConfirmar = async () => {
    setEnCurso(true);
    try {
      await onConfirmar?.();
    } finally {
      setEnCurso(false);
    }
  };

  const handleCancelar = async () => {
    setEnCurso(true);
    try {
      await onCancelar?.();
    } finally {
      setEnCurso(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">
          Venta · {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </p>
        <span className="text-[11px] font-bold text-primary bg-primary-tint px-2 py-0.5 rounded-full shrink-0">
          {CANAL_LABEL[canal] ?? canal}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div
            key={item.productoId}
            className="flex items-center justify-between gap-2 bg-surface rounded-lg px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink truncate">{item.nombre}</p>
              <p className="text-[11px] text-muted">{resumenCantidad(item)}</p>
            </div>
            <span className="text-[12px] font-semibold text-ink shrink-0">{formatoCOP(item.subtotal)}</span>
          </div>
        ))}
      </div>

      {esRural && (
        <div className="flex flex-col gap-1 text-[12px] border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <span className="text-muted">Destinatario</span>
            <span className="text-ink font-medium">{destinatario || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Costo de envío</span>
            <span className="text-ink font-medium">{formatoCOP(costoEnvio)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[12px] text-muted border-t border-border pt-2">
        <span>Método de pago</span>
        <span className="text-ink font-medium">{metodoPago || '—'}</span>
      </div>

      <div className="flex items-center justify-between text-[13px] font-semibold text-ink">
        <span>Total</span>
        <span>{formatoCOP(total)}</span>
      </div>

      {completado ? (
        <p className="text-[13px] font-semibold text-success-fg pt-1">
          ✓ {textoRespuesta || 'Venta registrada'}
        </p>
      ) : !pendiente ? (
        <p className="text-[13px] text-muted pt-1">{textoRespuesta || 'Venta cancelada.'}</p>
      ) : (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={enCurso}
            className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
          >
            {enCurso ? 'Confirmando…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={handleCancelar}
            disabled={enCurso}
            className="bg-surface hover:bg-border disabled:opacity-60 text-ink rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
