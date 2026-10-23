import { useState } from 'react';
import { createPortal } from 'react-dom';
import { mensajeError } from './plataformaUtils';

const TONOS = {
  primary: 'bg-primary-tint text-primary',
  warning: 'bg-amber-50 text-amber-600',
};

/**
 * Confirmación del panel de plataforma (reenviar acceso, aviso de correo no enviado).
 * onConfirmar es async: si falla, el error se muestra dentro del modal; si termina bien,
 * el modal se cierra con su animación y llama a onCerrar.
 * Se monta en document.body: el contenedor de AppLayout anima con transform y un
 * "fixed" dentro de él quedaría pegado al contenido y no a la ventana.
 */
export default function ModalConfirmacion({
  abierto, tono = 'primary', icono, titulo, children,
  textoConfirmar, textoProcesando = 'Procesando...', textoCancelar = 'Cancelar',
  onConfirmar, onCerrar,
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [cerrando, setCerrando] = useState(false);

  if (!abierto) return null;

  const cerrar = () => {
    if (cerrando || enviando) return;
    setCerrando(true);
    setTimeout(() => {
      setCerrando(false);
      setError('');
      onCerrar();
    }, 200);
  };

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      await onConfirmar();
      setEnviando(false);
      setCerrando(true);
      setTimeout(() => { setCerrando(false); onCerrar(); }, 200);
    } catch (err) {
      setEnviando(false);
      setError(mensajeError(err, 'No se pudo completar la acción. Intenta de nuevo.'));
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm ${cerrando ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={cerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-plataforma"
        className={`w-full max-w-[420px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-8 flex flex-col gap-6 ${cerrando ? 'animate-scale-out' : 'animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          {icono && (
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${TONOS[tono]}`}>
              {icono}
            </div>
          )}
          <h3 id="titulo-modal-plataforma" className="font-display font-bold text-lg text-ink">{titulo}</h3>
          <div className="text-sm text-muted leading-relaxed">{children}</div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm flex items-start gap-2 animate-slide-down">
            <svg width="15" height="15" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={cerrar}
            disabled={enviando}
            className="flex-1 py-3 rounded-xl bg-surface text-ink text-sm font-semibold hover:bg-border transition duration-300 active:scale-[0.97] disabled:opacity-60"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition duration-300 active:scale-[0.97] shadow-[0_2px_8px_rgba(158,32,22,0.25)] disabled:opacity-60"
          >
            {enviando && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />}
            {enviando ? textoProcesando : textoConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
