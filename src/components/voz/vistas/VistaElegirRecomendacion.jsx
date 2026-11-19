import { useState } from 'react';
import { formatoCOP } from '../formato';

/**
 * "¿Cuál quieres aprobar?" cuando hay varias recomendaciones el mismo día (o varias coinciden).
 * El backend manda en `datos`: titulo, pregunta, ayuda, aviso? y opciones
 * [{ numero, ordinal, recomendacionId, codigo, hora, costoTotal, presupuesto, productos, respuesta }].
 *
 * Se responde por voz (el micrófono se abre solo al terminar de leer la pregunta) o tocando una
 * tarjeta, que envía la misma respuesta que se diría ("la primera", "la segunda"…).
 */
export default function VistaElegirRecomendacion({ datos, onElegir }) {
  const [elegida, setElegida] = useState(null);
  const opciones = datos.opciones ?? [];

  const elegir = (opcion) => {
    if (elegida || !onElegir) return;
    setElegida(opcion.recomendacionId);
    onElegir(opcion.respuesta ?? `código ${opcion.codigo}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Encabezado */}
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Recomendación de compra</p>
          <p className="text-[14px] font-semibold text-ink leading-tight">{datos.titulo}</p>
        </div>
        <span className="ml-auto shrink-0 text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
          {opciones.length} opciones
        </span>
      </div>

      {datos.aviso && (
        <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          {datos.aviso}
        </p>
      )}

      <p className="text-[13px] font-semibold text-ink">{datos.pregunta}</p>

      {/* Opciones */}
      <ul className="flex flex-col gap-2">
        {opciones.map((o) => {
          const esElegida = elegida === o.recomendacionId;
          return (
            <li key={o.recomendacionId}>
              <button
                type="button"
                onClick={() => elegir(o)}
                disabled={!!elegida}
                className={`w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all
                  ${esElegida
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                    : 'border-border bg-white hover:border-primary hover:shadow-sm disabled:opacity-50'}`}
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white text-[12px] font-bold flex items-center justify-center">
                  {o.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-ink">{o.ordinal}</span>
                    <span className="text-[12px] text-muted">· {o.hora}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] tracking-wide text-ink bg-surface border border-border rounded px-1.5 py-px">
                      {o.codigo}
                    </span>
                    {o.productos > 0 && (
                      <span className="text-[11px] text-muted">
                        {o.productos} {o.productos === 1 ? 'producto' : 'productos'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-bold text-ink">{formatoCOP(o.costoTotal)}</p>
                  {o.presupuesto != null && (
                    <p className="text-[10px] text-muted">de {formatoCOP(o.presupuesto)}</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Cómo responder */}
      <div className="flex items-start gap-2 rounded-lg bg-surface px-3 py-2">
        <svg className="w-4 h-4 text-primary shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11a7 7 0 01-14 0m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 10-6 0v7a3 3 0 003 3z" />
        </svg>
        <p className="text-[11px] text-muted leading-snug">{datos.ayuda}</p>
      </div>
    </div>
  );
}
