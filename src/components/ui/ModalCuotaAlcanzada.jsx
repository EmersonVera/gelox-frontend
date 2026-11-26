// src/components/ui/ModalCuotaAlcanzada.jsx — RF70: 409 «Cuota del plan alcanzada»
// Cuerpo del backend (GlobalExceptionHandler / CuotaAlcanzadaException):
//   { error: 'Cuota del plan alcanzada', codigo: 'CUOTA_PLAN_ALCANZADA', cuota: 'USUARIOS' | 'PRODUCTOS' | …, limite, usado }
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { MENSAJE_CUOTA } from '../../utils/errores';

const RECURSOS = {
  USUARIOS:          { plural: 'usuarios',     titulo: 'Usuarios internos',    liberar: 'Deshabilitar un usuario libera su cupo de inmediato.' },
  PRODUCTOS:         { plural: 'productos activos', titulo: 'Productos activos', liberar: 'Desactivar productos que ya no vendes libera su cupo de inmediato.' },
  COMERCIANTES:      { plural: 'comerciantes activos', titulo: 'Comerciantes activos', liberar: 'Desactivar un comerciante libera su cupo de inmediato.' },
  ALMACENAMIENTO_MB: { plural: 'MB de almacenamiento', titulo: 'Almacenamiento (MB)', liberar: 'Borrar imágenes que ya no usas libera espacio.' },
};

const RECURSO_POR_NOMBRE = { usuarios: 'USUARIOS', productos: 'PRODUCTOS', comerciantes: 'COMERCIANTES', almacenamiento: 'ALMACENAMIENTO_MB' };

const n = (v) => Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 });

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * error:   el error de axios (o de errorDeRespuesta) con el 409 de cuota.
 * recurso: 'usuarios' | 'productos' | 'comerciantes' — por si el cuerpo no trae «cuota».
 * nombre:  lo que se intentó crear o activar (ej. «Andrea Silva»), opcional.
 * accion:  { label, onClick } — acción secundaria para liberar cupo (ej. ir a la lista), opcional.
 */
export default function ModalCuotaAlcanzada({ error, recurso, nombre, accion, onClose }) {
  const { rol } = useAuth();
  const data = error?.response?.data && typeof error.response.data === 'object' ? error.response.data : {};
  const tipo = data.cuota ?? RECURSO_POR_NOMBRE[recurso] ?? 'USUARIOS';
  const info = RECURSOS[tipo] ?? { plural: String(tipo).toLowerCase(), titulo: tipo, liberar: '' };
  const tieneNumeros = data.limite != null && data.usado != null;
  const pct = tieneNumeros && Number(data.limite) > 0 ? Math.min(100, (Number(data.usado) / Number(data.limite)) * 100) : 100;
  const esGerente = rol === 'ADMINISTRADOR';

  return createPortal(
    // stopPropagation: el portal propaga el clic por el árbol de React y cerraría el formulario que lo abrió
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        role="alertdialog"
        aria-labelledby="titulo-cuota"
        aria-describedby="texto-cuota"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-6 flex flex-col gap-5 animate-scale-in"
      >
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-xl bg-[#fef3c7] text-[#b45309] flex items-center justify-center shrink-0"><LockIcon /></span>
          <div className="flex-1 min-w-0">
            <h2 id="titulo-cuota" className="font-display text-xl font-bold text-ink">{MENSAJE_CUOTA}</h2>
            <p id="texto-cuota" className="text-sm text-muted mt-1">
              No se pudo {nombre ? <>guardar «{nombre}»</> : 'guardar el registro'}.{' '}
              {tieneNumeros
                ? <>Tu plan permite hasta <strong className="text-ink">{n(data.limite)} {info.plural}</strong> y ya tienes {n(data.usado)}.</>
                : <>Tu plan ya no admite más {info.plural}.</>}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {tieneNumeros && (
          <div className="rounded-xl border border-border px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-ink">{info.titulo}</span>
              <span className="font-bold text-[#dc2626]">{n(data.usado)} / {n(data.limite)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface mt-2 overflow-hidden">
              <div className="h-full rounded-full bg-[#dc2626]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="rounded-xl bg-[#eff6ff] px-4 py-3 text-[13px] text-[#1e40af]">
          {esGerente
            ? `${info.liberar} La ampliación del plan la aprueba el Superadministrador de la plataforma.`
            : 'Solo el Gerente puede pedir la ampliación del plan. Tus datos del formulario se conservan hasta que haya cupo.'}
        </div>

        <div className="flex justify-end gap-3">
          {accion && (
            <button
              type="button"
              onClick={accion.onClick}
              className="px-4 py-2.5 text-sm font-semibold text-ink border border-border rounded-xl hover:bg-surface transition"
            >
              {accion.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
