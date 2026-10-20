import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { descargarExportacionPedido } from '../../../services/vozService';
import useCuentaRegresiva from './useCuentaRegresiva';

/**
 * Vista para MODIFICAR_PEDIDO (RF53). Vive dentro de PanelAsistenteVoz.jsx
 * (dropdown de 320px, ver Navbar.jsx), por eso es compacta de una sola
 * columna. No hay mockup en Figma para esta vista. Todo sale de la respuesta
 * de useAsistenteVoz, así el Excel aparece igual si se confirmó por voz.
 */

const ACCION_INFO = {
  AGREGAR: { label: 'Agregar', pill: 'bg-success-bg text-success-fg' },
  ELIMINAR: { label: 'Eliminar', pill: 'bg-error-bg text-error-fg' },
  ACTUALIZAR: { label: 'Actualizar', pill: 'bg-amber-50 text-amber-700' },
};

export default function VistaModificarPedido({
  ok = true,
  datos,
  textoRespuesta,
  requiereConfirmacion,
  expiraEnSegundos,
  cancelado,
  onConfirmar,
  onCancelar,
}) {
  const navigate = useNavigate();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  // useCuentaRegresiva debe llamarse siempre en el mismo orden (Rules of
  // Hooks), antes de los `return` tempranos de los flujos alterno/sin datos.
  const completado = !!datos?.exportUrl;
  const pendiente = ok && !!requiereConfirmacion && !completado;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  // Flujo alterno de RF53: no hay pedido pendiente, hay varios y no se dijo a
  // cuál, o el producto no está en el pedido. Solo hay un mensaje que mostrar.
  if (!ok || !datos?.accion) {
    return (
      <p className="text-[13px] text-ink leading-snug">
        {textoRespuesta || 'No se pudo modificar el pedido pendiente.'}
      </p>
    );
  }

  const { pedidoId, accion, producto, cantidadAnterior, cantidadNueva } = datos;
  const accionInfo = ACCION_INFO[accion] ?? { label: accion, pill: 'bg-surface text-muted' };
  const numeroPedido = pedidoId ? pedidoId.slice(0, 8).toUpperCase() : '—';

  // Confirmar por voz o con el botón va por el mismo camino (useAsistenteVoz).
  const accionBoton = (fn) => async () => {
    setEnCurso(true);
    setError('');
    try {
      await fn?.();
    } finally {
      setEnCurso(false);
    }
  };

  const handleDescargar = async () => {
    if (!datos.exportUrl) return;
    setError('');
    setDescargando(true);
    try {
      await descargarExportacionPedido(datos.exportUrl);
    } catch {
      setError('No se pudo descargar el archivo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">
          Pedido #{numeroPedido}
        </span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${accionInfo.pill}`}>
          {accionInfo.label}
        </span>
      </div>

      <p className="text-[13px] font-semibold text-ink">{producto}</p>
      <p className="text-[12px] text-muted">
        {cantidadAnterior} → <span className="font-semibold text-ink">{cantidadNueva}</span>
      </p>

      {error && <p className="text-[12px] text-danger">{error}</p>}

      {completado ? (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[13px] font-semibold text-success-fg">✓ Pedido actualizado</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/inventarios/pedidos/${pedidoId}`)}
              className="flex-1 bg-white border border-border hover:bg-surface text-ink rounded-lg py-2 text-[13px] font-semibold transition-colors"
            >
              Ver pedido
            </button>
            <button
              type="button"
              onClick={handleDescargar}
              disabled={descargando}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
            >
              {descargando ? 'Descargando…' : 'Excel'}
            </button>
          </div>
        </div>
      ) : cancelado || !pendiente ? (
        <p className="text-[13px] text-muted pt-1">{textoRespuesta || 'Modificación cancelada.'}</p>
      ) : (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={accionBoton(onConfirmar)}
              disabled={enCurso || expirado}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
            >
              {enCurso ? 'Un momento…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={accionBoton(onCancelar)}
              disabled={enCurso}
              className="bg-surface hover:bg-border disabled:opacity-60 text-ink rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
          {pendiente && (
            <p className="text-[11px] text-muted text-center">
              {expirado ? 'El tiempo para confirmar expiró.' : `Expira en ${restantes}s`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
