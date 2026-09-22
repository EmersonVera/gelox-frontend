import { useEffect, useState } from 'react';
import { confirmarComando, descargarExportacionPedido } from '../../../services/vozService';

/**
 * Vista para GENERAR_PEDIDO (RF52). Vive dentro de PanelAsistenteVoz.jsx, un
 * dropdown de 320px (ver Navbar.jsx) — por eso el layout es compacto de una
 * sola columna, no la vitrina de dos columnas de GenerarPedido.jsx. El panel
 * padre solo trae un botón "Cancelar" genérico (aborta la sesión de voz), así
 * que el confirmar/cancelar del pedido en sí se resuelve aquí, llamando
 * directo a confirmarComando (mock o real según VITE_USAR_MOCK_VOZ).
 *
 * Los ítems ya vienen resueltos por la voz: no hay búsqueda de catálogo ni
 * "agregar producto". Las cantidades son de solo lectura — el contrato de
 * confirmarComando no acepta cantidades editadas (ver aviso técnico en
 * docs/T48_Instrucciones_Emerson.md).
 */

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

function resumenCantidad(item) {
  const partes = [];
  if (item.cantidadCajas) partes.push(`${item.cantidadCajas} cj`);
  if (item.cantidadUnidades) partes.push(`${item.cantidadUnidades} un`);
  return partes.join(' · ') || '—';
}

export default function VistaPedido({ comandoId, datos, requiereConfirmacion, expiraEnSegundos }) {
  const [datosActuales, setDatosActuales] = useState(datos);
  const [estado, setEstado] = useState('pendiente'); // pendiente | confirmando | cancelado
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  const completado = !!(datosActuales?.pedidoId || datosActuales?.exportUrl);
  const pendiente = requiereConfirmacion && !completado && estado === 'pendiente';
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  if (!datosActuales) {
    return <p className="text-[13px] text-muted">No hay datos de pedido para mostrar.</p>;
  }

  const items = datosActuales.items ?? [];
  const totalCajas = items.reduce((s, i) => s + (Number(i.cantidadCajas) || 0), 0);
  const totalUnidades = items.reduce((s, i) => s + (Number(i.cantidadUnidades) || 0), 0);

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
      <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">
        Pedido a proveedor · {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
      </p>

      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div
            key={item.productoId}
            className="flex items-center justify-between gap-2 bg-surface rounded-lg px-2.5 py-1.5"
          >
            <span className="text-[13px] font-medium text-ink truncate min-w-0">{item.nombre}</span>
            <span className="text-[12px] text-muted shrink-0">{resumenCantidad(item)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[12px] font-semibold text-ink border-t border-border pt-2">
        <span>Total</span>
        <span>{totalCajas} cajas · {totalUnidades} unidades</span>
      </div>

      {error && <p className="text-[12px] text-danger">{error}</p>}

      {completado ? (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[13px] font-semibold text-success-fg">✓ Pedido registrado</p>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
          >
            {descargando ? 'Descargando…' : 'Descargar Excel'}
          </button>
        </div>
      ) : estado === 'cancelado' ? (
        <p className="text-[13px] text-muted pt-1">Pedido cancelado.</p>
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
