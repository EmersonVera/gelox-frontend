import { ESTADOS_VOZ } from '../../hooks/useAsistenteVoz';

export function MicrofonoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

/**
 * Botón de 32px (mismas clases del hamburguesa del Navbar) que abre el
 * panel del asistente de voz. Si el navegador no soporta reconocimiento de
 * voz, o el usuario ya negó el permiso del micrófono, no se renderiza el
 * botón: en su lugar avisa que use el formulario manual.
 */
export default function BotonMicrofono({ open, estado, soportado, permisoDenegado, onClick }) {
  if (!soportado || permisoDenegado) {
    return (
      <span
        className="hidden sm:inline text-[11px] text-muted"
        title="Este navegador no permite usar el micrófono."
      >
        Usa el formulario manual
      </span>
    );
  }

  const escuchando = estado === ESTADOS_VOZ.ESCUCHANDO || estado === ESTADOS_VOZ.TRANSCRIBIENDO;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Cerrar asistente de voz' : 'Activar asistente de voz'}
      aria-pressed={open}
      className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition duration-300 active:scale-90 ${
        open ? 'text-primary bg-primary-tint' : 'text-ink hover:bg-surface'
      }`}
    >
      {escuchando && (
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" aria-hidden="true" />
      )}
      <MicrofonoIcon />
    </button>
  );
}
