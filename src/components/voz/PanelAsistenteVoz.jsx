import { ESTADOS_VOZ } from '../../hooks/useAsistenteVoz';
import { MicrofonoIcon } from './BotonMicrofono';
import VistaRespuesta from './VistaRespuesta';

const MENSAJE_PERMISO_DENEGADO = 'No pudimos acceder al micrófono. Revisa los permisos del navegador.';

/**
 * Ventana bajo el header con el estado del asistente de voz. Se posiciona
 * y anima igual que el dropdown de AlertasBell (Navbar.jsx); el cierre al
 * hacer clic afuera lo controla AsistenteVoz, que es quien monta/desmonta
 * este panel.
 */
export default function PanelAsistenteVoz({
  estado,
  transcripcionParcial,
  textoFinal,
  respuesta,
  permisoDenegado,
  onCancelar,
}) {
  const escuchando = estado === ESTADOS_VOZ.ESCUCHANDO || estado === ESTADOS_VOZ.TRANSCRIBIENDO;
  const interpretando = estado === ESTADOS_VOZ.INTERPRETANDO;
  const esError = estado === ESTADOS_VOZ.ERROR;

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] bg-white border border-border rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-dropdown-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-primary">
          <MicrofonoIcon />
        </span>
        <span className="font-semibold text-[14px] text-ink">Asistente de voz</span>
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-3 space-y-3 min-h-[64px]" aria-live="polite">
        {escuchando && (
          <div className="flex items-center gap-2 text-[13px] text-primary font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Escuchando…
          </div>
        )}

        {(escuchando || textoFinal) && (
          <div>
            {textoFinal && !escuchando && (
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-0.5">Dijiste</p>
            )}
            <p className="text-[13px] text-ink italic leading-snug min-h-[1.25em]">
              {textoFinal || transcripcionParcial || 'Decí tu comando…'}
            </p>
          </div>
        )}

        {interpretando && (
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Interpretando comando…
          </div>
        )}

        {permisoDenegado ? (
          <div className="px-3 py-2 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-[13px]">
            {MENSAJE_PERMISO_DENEGADO}
          </div>
        ) : esError && respuesta?.textoRespuesta ? (
          <div className="px-3 py-2 rounded-xl bg-error-bg border border-[#ffb4a9] text-error-fg text-[13px]">
            {respuesta.textoRespuesta}
          </div>
        ) : (
          respuesta && <VistaRespuesta respuesta={respuesta} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <button
          type="button"
          onClick={onCancelar}
          className="w-full text-center text-[13px] font-semibold text-muted hover:text-ink hover:bg-surface rounded-lg py-2 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
