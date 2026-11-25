// src/components/ventas/ModalProrroga.jsx — el Gerente corre la fecha límite de pago de una planilla
import { useState } from 'react';
import { createPortal } from 'react-dom';
import ContenidoCarga from '../ui/ContenidoCarga';
import { extenderFechaLimite } from '../../services/creditoService';
import {
  MAX_DIAS_PRORROGA, sumarDias, diasEntre, formatoFecha, formatoCOP, hoyISO, mensajeError,
} from './creditoUtils';

/**
 * planilla: { planillaId, codigo?, fechaLimitePago, saldo? }
 * onGuardado(fechaLimitePago) se llama con la nueva fecha ya guardada.
 */
export default function ModalProrroga({ planilla, onClose, onGuardado }) {
  const actual = planilla.fechaLimitePago ?? hoyISO();
  const maxima = sumarDias(actual, MAX_DIAS_PRORROGA);
  const [nueva, setNueva]       = useState(sumarDias(actual, Math.min(7, MAX_DIAS_PRORROGA)));
  const [motivo, setMotivo]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]       = useState('');

  const dias = diasEntre(actual, nueva);
  const errorFecha = !nueva
    ? 'Elige la nueva fecha.'
    : dias <= 0
      ? 'Debe ser posterior a la fecha límite actual.'
      : dias > MAX_DIAS_PRORROGA ? `Máximo ${MAX_DIAS_PRORROGA} días adicionales.` : '';

  const guardar = async (e) => {
    e.preventDefault();
    if (errorFecha) return;
    if (!motivo.trim()) { setError('Escribe el motivo de la prórroga: queda registrado en auditoría.'); return; }
    setGuardando(true);
    setError('');
    try {
      await extenderFechaLimite(planilla.planillaId, {
        fechaLimitePago: nueva, motivo: motivo.trim(), fechaLimiteActual: actual,
      });
      onGuardado(nueva);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo extender la fecha límite.'));
    } finally {
      setGuardando(false);
    }
  };

  const input = 'w-full px-3.5 py-2.5 border border-border rounded-xl text-sm bg-white text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <form
        onSubmit={guardar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-scale-in"
      >
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg font-bold text-ink">Prórroga de la fecha límite</h2>
          <p className="text-xs text-muted mt-1">
            {planilla.codigo ? `${planilla.codigo} · ` : ''}
            {planilla.saldo != null ? `saldo ${formatoCOP(planilla.saldo)} · ` : ''}
            Solo el Gerente puede prorrogar; queda registrado en auditoría.
          </p>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Fecha límite actual</label>
            <div className={`${input} bg-surface text-muted`}>{formatoFecha(actual)}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="nueva-fecha">Nueva fecha límite *</label>
            <input
              id="nueva-fecha"
              type="date"
              value={nueva}
              min={sumarDias(actual, 1)}
              max={maxima}
              onChange={(e) => setNueva(e.target.value)}
              className={`${input} ${errorFecha ? 'border-[#dc2626]' : ''}`}
            />
            <p className={`text-[11px] mt-1 ${errorFecha ? 'text-[#dc2626]' : 'text-muted'}`}>
              {errorFecha || `+${dias} día${dias === 1 ? '' : 's'} · máximo ${MAX_DIAS_PRORROGA} adicionales`}
            </p>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-ink mb-1.5" htmlFor="motivo-prorroga">Motivo *</label>
            <input
              id="motivo-prorroga"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              placeholder="Ej. Acuerdo por temporada baja"
              className={input}
            />
          </div>
          {error && (
            <div className="col-span-2 px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-ink border border-border rounded-xl hover:bg-surface transition">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || !!errorFecha}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition disabled:opacity-50"
          >
            <ContenidoCarga cargando={guardando} textoCargando="Guardando...">Extender fecha límite</ContenidoCarga>
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
