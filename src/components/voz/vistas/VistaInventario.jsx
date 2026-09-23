import { useState } from 'react';

const ESTADO_INFO = {
  NORMAL: { label: 'Normal', pill: 'bg-success-bg text-success-fg' },
  BAJO_STOCK: { label: 'Bajo stock', pill: 'bg-red-100 text-red-700' },
  STOCK_MEDIO: { label: 'Stock medio', pill: 'bg-amber-100 text-amber-700' },
};

function resumenCantidad(producto) {
  const cajas = producto.cajas ?? 0;
  const unidades = producto.unidadesSueltas ?? 0;
  return `${cajas} ${cajas === 1 ? 'caja' : 'cajas'} y ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;
}

export default function VistaInventario({ respuesta, onConfirmar, onCancelar }) {
  const [enCurso, setEnCurso] = useState(false);
  const { datos, textoRespuesta, requiereConfirmacion } = respuesta ?? {};

  if (requiereConfirmacion) {
    const sugerencia = datos?.sugerencia;

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
        <p className="text-[13px] text-ink leading-snug">
          {textoRespuesta || (sugerencia ? `¿Quisiste decir "${sugerencia}"?` : '¿Quisiste decir esto?')}
        </p>
        <div className="flex gap-2">
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
      </div>
    );
  }

  const productos = datos?.productos ?? [];
  const alertas = datos?.alertas ?? [];

  if (productos.length === 0) {
    return (
      <p className="text-[13px] text-ink leading-snug">
        {textoRespuesta || 'No hay datos de inventario para mostrar.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">
        Inventario · {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
      </p>

      {alertas.length > 0 && (
        <div className="px-3 py-2 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-[12px] flex items-start gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>
            {alertas.length === 1 ? '1 producto' : `${alertas.length} productos`} por debajo del mínimo:{' '}
            {alertas.map((a) => a.nombre).join(', ')}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {productos.map((producto) => {
          const info = ESTADO_INFO[producto.estado] ?? { label: producto.estado, pill: 'bg-surface text-muted' };
          return (
            <div
              key={producto.productoId ?? producto.nombre}
              className="flex items-center justify-between gap-2 bg-surface rounded-lg px-2.5 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{producto.nombre}</p>
                <p className="text-[11px] text-muted">{resumenCantidad(producto)}</p>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${info.pill}`}>
                {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
