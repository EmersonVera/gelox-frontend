import { useEffect, useState } from 'react';
import { formatoCOP } from '../formato';

const CANAL_LABEL = {
  VENTANILLA: 'Ventanilla',
  RURAL: 'Rural',
};

function useCuentaRegresiva(expiraEnSegundos, activo) {
  const [restantes, setRestantes] = useState(expiraEnSegundos ?? null);
  const [expiraPrevio, setExpiraPrevio] = useState(expiraEnSegundos ?? null);


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

function resumenCantidad(item) {
  const partes = [];
  if (item.cajas) partes.push(`${item.cajas} cj`);
  if (item.unidades) partes.push(`${item.unidades} un`);
  return partes.join(' · ') || '—';
}

export default function VistaVenta({ respuesta, onConfirmar, onCancelar }) {
  const [enCurso, setEnCurso] = useState(false);
  const { datos, textoRespuesta, requiereConfirmacion, expiraEnSegundos } = respuesta ?? {};

  const pendiente = !!requiereConfirmacion;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

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
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={enCurso || expirado}
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
          {restantes !== null && (
            <p className="text-[11px] text-muted text-center">
              {expirado ? 'El tiempo para confirmar expiró.' : `Expira en ${restantes}s`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
