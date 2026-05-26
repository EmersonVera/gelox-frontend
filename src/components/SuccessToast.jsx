import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * SuccessToast
 * Muestra una alerta flotante verde en la esquina inferior-derecha.
 *
 * Props:
 *   message  — texto a mostrar
 *   show     — boolean que controla visibilidad
 *   onClose  — callback para desmontar desde el padre
 *   duration — ms antes de auto-cerrar (default 4000)
 */
export default function SuccessToast({ message, show, onClose, duration = 4000 }) {
  const [visible, setVisible]   = useState(false);
  const [leaving, setLeaving]   = useState(false);

  /* Entrada */
  useEffect(() => {
    if (show) {
      setLeaving(false);
      setVisible(true);
    }
  }, [show]);

  /* Auto-dismiss */
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration]);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      setLeaving(false);
      onClose?.();
    }, 300);
  };

  if (!visible) return null;

  return createPortal(
    <div
      role="alert"
      aria-live="polite"
      className={[
        /* posición */
        'fixed bottom-6 right-6 z-[99999]',
        /* layout */
        'flex items-center gap-3',
        /* visual — colores del design system (success tokens + borde esmeralda) */
        'bg-success-bg border border-emerald-300 text-success-fg',
        /* forma */
        'rounded-2xl shadow-lg shadow-emerald-500/15 px-4 py-3',
        /* tamaño */
        'max-w-xs w-full sm:w-auto',
        /* animación */
        leaving
          ? 'animate-[toast-out_0.3s_ease-in_forwards]'
          : 'animate-[toast-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)_forwards]',
      ].join(' ')}
    >
      {/* Icono */}
      <span className="shrink-0 w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
        <CheckIcon />
      </span>

      {/* Texto */}
      <p className="text-sm font-semibold leading-snug flex-1">{message}</p>

      {/* Cerrar */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 ml-1 text-emerald-500 hover:text-emerald-700 hover:scale-110 transition duration-200"
      >
        <XIcon />
      </button>
    </div>,
    document.body,
  );
}
