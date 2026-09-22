import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmarComando, descargarExportacionPedido } from '../../../services/vozService';

/**
 * Vista para MODIFICAR_PEDIDO (RF53). Vive dentro de PanelAsistenteVoz.jsx
 * (dropdown de 320px, ver Navbar.jsx), por eso es compacta de una sola
 * columna. No hay mockup en Figma para esta vista. El confirmar/cancelar se
 * resuelve aquí mismo con confirmarComando, ya que el panel padre solo trae
 * un "Cancelar" genérico que aborta toda la sesión de voz.
 */

const ACCION_INFO = {
  AGREGAR: { label: 'Agregar', pill: 'bg-success-bg text-success-fg' },
  ELIMINAR: { label: 'Eliminar', pill: 'bg-error-bg text-error-fg' },
  ACTUALIZAR: { label: 'Actualizar', pill: 'bg-amber-50 text-amber-700' },
};

function useCuentaRegresiva(expiraEnSegundos, activo) {
  const [restantes, setRestantes] = useState(expiraEnSegundos ?? null);
  const [expiraPrevio, setExpiraPrevio] = useState(expiraEnSegundos ?? null);

  // Reinicia el contador cuando llega una nueva expiración (nuevo comando de
  // voz), ajustando el estado durante el render en vez de en un efecto.
  if ((expiraEnSegundos ?? null) !== expiraPrevio) {
    setExpiraPrevio(expiraEnSegundos ?? null);
    setRestantes(expiraEnSegundos ?? null);
  }

  useEffect(() => {
    if (!activo || restantes === null || restantes <= 0) return;
    const id = setTimeout(() => setRestantes((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [activo, restantes]);

  return restantes;
}

export default function VistaModificarPedido({
  ok = true,
  comandoId,
  datos,
  textoRespuesta,
  requiereConfirmacion,
  expiraEnSegundos,
}) {
  const navigate = useNavigate();
  const [datosActuales, setDatosActuales] = useState(datos);
  const [estado, setEstado] = useState('pendiente'); // pendiente | confirmando | cancelado
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  // useCuentaRegresiva debe llamarse siempre en el mismo orden (Rules of
  // Hooks), antes de los `return` tempranos de los flujos alterno/sin datos.
  const completado = !!datosActuales?.exportUrl;
  const pendiente = ok && requiereConfirmacion && !completado && estado === 'pendiente';
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  // Flujo alterno de RF53: no hay pedido pendiente o el producto no está en
  // el pedido. El backend solo trae textoRespuesta, sin botones que mostrar.
  if (!ok) {
    return (
      <p className="text-[13px] text-ink leading-snug">
        {textoRespuesta || 'No se pudo modificar el pedido pendiente.'}
      </p>
    );
  }

  if (!datosActuales) {
    return <p className="text-[13px] text-muted">No hay datos de modificación para mostrar.</p>;
  }

  const { pedidoId, accion, producto, cantidadAnterior, cantidadNueva } = datosActuales;
  const accionInfo = ACCION_INFO[accion] ?? { label: accion, pill: 'bg-surface text-muted' };
  const numeroPedido = pedidoId ? pedidoId.slice(0, 8).toUpperCase() : '—';

  const handleConfirmar = async () => {
    setEstado('confirmando');
    setError('');
    try {
      const resp = await confirmarComando(comandoId, true);
      setDatosActuales(resp?.datos ?? datosActuales);
    } catch {
      setError('No se pudo confirmar. Intenta de nuevo.');
      setEstado('pendiente');
    }
  };

  const handleCancelar = async () => {
    setEstado('confirmando');
    try {
      await confirmarComando(comandoId, false);
    } catch {
      // Aunque falle la notificación al backend, igual reflejamos la cancelación local.
    }
    setEstado('cancelado');
  };

  const handleDescargar = async () => {
    if (!datosActuales.exportUrl) return;
    setError('');
    setDescargando(true);
    try {
      await descargarExportacionPedido(datosActuales.exportUrl);
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
      ) : estado === 'cancelado' ? (
        <p className="text-[13px] text-muted pt-1">Modificación cancelada.</p>
      ) : (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={estado === 'confirmando' || expirado}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
            >
              {estado === 'confirmando' ? 'Confirmando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={handleCancelar}
              disabled={estado === 'confirmando'}
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
