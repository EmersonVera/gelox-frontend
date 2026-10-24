import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ROL_LABEL, esActivo, iniciales, mensajeError } from './usuariosUtils';

function BanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

/**
 * Confirmación para deshabilitar o habilitar un usuario interno (RF62, mockup «Modal Deshabilitar»).
 * La acción sale del estado actual del usuario. onConfirmar es async: si falla, el error se
 * muestra dentro del modal; si termina bien, el modal se cierra con su animación.
 * Se monta en document.body para que el "fixed" no quede atrapado en el transform de AppLayout.
 */
export default function ModalEstadoUsuario({ usuario, onConfirmar, onCerrar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [cerrando, setCerrando] = useState(false);

  if (!usuario) return null;

  const deshabilitar = esActivo(usuario);
  const nombre = usuario.nombre ?? 'este usuario';
  const registros = usuario.rol === 'ENCARGADO_INVENTARIO' ? 'inventario' : 'ventas';

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
      setError(mensajeError(err, 'No se pudo cambiar el estado del usuario. Intenta de nuevo.'));
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
        aria-labelledby="titulo-modal-estado-usuario"
        className={`w-full max-w-[440px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-6 flex flex-col gap-5 ${cerrando ? 'animate-scale-out' : 'animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${deshabilitar ? 'bg-primary-tint text-primary' : 'bg-green-50 text-green-600'}`}>
            {deshabilitar ? <BanIcon /> : <CheckCircleIcon />}
          </div>
          <div className="min-w-0">
            <h3 id="titulo-modal-estado-usuario" className="font-display font-bold text-lg text-ink leading-snug">
              {deshabilitar ? `¿Deshabilitar a ${nombre}?` : `¿Habilitar a ${nombre}?`}
            </h3>
            <p className="text-sm text-muted leading-relaxed mt-1">
              {deshabilitar
                ? `Su sesión se cerrará de inmediato y no podrá volver a ingresar hasta que la habilites otra vez. Sus registros de ${registros} se conservan.`
                : 'Podrá volver a ingresar con su correo y la misma contraseña, con el rol que tenía asignado.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface min-w-0">
          <span className="w-7 h-7 rounded-full bg-primary-tint text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
            {iniciales(usuario.nombre)}
          </span>
          <p className="text-sm text-ink truncate">
            {usuario.nombre}
            <span className="text-muted"> · {ROL_LABEL[usuario.rol] ?? usuario.rol}</span>
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-sm flex items-start gap-2 animate-slide-down">
            <svg width="15" height="15" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={cerrar}
            disabled={enviando}
            className="px-5 py-2.5 rounded-xl bg-surface text-ink text-sm font-semibold hover:bg-border transition duration-300 active:scale-[0.97] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition duration-300 active:scale-[0.97] disabled:opacity-60 ${
              deshabilitar
                ? 'bg-danger hover:bg-danger-dark shadow-[0_2px_8px_rgba(186,26,26,0.25)]'
                : 'bg-green-500 hover:bg-green-600 shadow-[0_2px_8px_rgba(22,163,74,0.25)]'
            }`}
          >
            {enviando && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />}
            {enviando
              ? (deshabilitar ? 'Deshabilitando...' : 'Habilitando...')
              : (deshabilitar ? 'Deshabilitar' : 'Habilitar')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
