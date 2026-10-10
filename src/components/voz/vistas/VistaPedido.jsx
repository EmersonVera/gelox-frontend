import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { descargarExportacionPedido } from '../../../services/vozService';

/**
 * Vista para GENERAR_PEDIDO (RF52). Vive dentro de PanelAsistenteVoz.jsx, un
 * dropdown de 320px (ver Navbar.jsx) — por eso el layout es compacto de una
 * sola columna, no la vitrina de dos columnas de GenerarPedido.jsx.
 *
 * Todo sale de `respuesta` (useAsistenteVoz): confirmar por voz o con el botón
 * pasa por el mismo camino, así al confirmar aparece "Descargar Excel" de
 * cualquiera de las dos formas. "Editar en Generar pedido" cancela el comando
 * de voz y abre esa pantalla con los productos ya cargados para ajustarlos a mano.
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

export default function VistaPedido({ respuesta, onConfirmar, onCancelar }) {
  const navigate = useNavigate();
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  const { datos, textoRespuesta, requiereConfirmacion, expiraEnSegundos, cancelado } = respuesta ?? {};
  const completado = !!(datos?.pedidoId || datos?.exportUrl);
  const pendiente = !!requiereConfirmacion && !completado;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  const items = datos?.items ?? [];
  if (items.length === 0) {
    return <p className="text-[13px] text-ink leading-snug">{textoRespuesta || 'No hay datos de pedido para mostrar.'}</p>;
  }

  const totalCajas = items.reduce((s, i) => s + (Number(i.cantidadCajas) || 0), 0);
  const totalUnidades = items.reduce((s, i) => s + (Number(i.cantidadUnidades) || 0), 0);

  const accion = (fn) => async () => {
    setEnCurso(true);
    setError('');
    try {
      await fn?.();
    } finally {
      setEnCurso(false);
    }
  };

  const handleEditar = async () => {
    setEnCurso(true);
    try {
      await onCancelar?.(); // el pedido se termina de armar a mano
    } finally {
      setEnCurso(false);
    }
    navigate('/inventarios/generar-pedido', {
      state: {
        itemsVoz: items.map((i) => ({
          productoId: i.productoId,
          cajas: Number(i.cantidadCajas) || 0,
          unidades: Number(i.cantidadUnidades) || 0,
        })),
      },
    });
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
          <p className="text-[13px] font-semibold text-success-fg">✓ Pedido registrado (Pendiente)</p>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
          >
            {descargando ? 'Descargando…' : 'Descargar Excel'}
          </button>
          <p className="text-[11px] text-muted text-center">
            También queda en Inventario → Reporte Pedido, para descargarlo después.
          </p>
        </div>
      ) : cancelado || !pendiente ? (
        <p className="text-[13px] text-muted pt-1">{textoRespuesta || 'Pedido cancelado.'}</p>
      ) : (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={accion(onConfirmar)}
              disabled={enCurso || expirado}
              className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors"
            >
              {enCurso ? 'Un momento…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={accion(onCancelar)}
              disabled={enCurso}
              className="bg-surface hover:bg-border disabled:opacity-60 text-ink rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
          <button
            type="button"
            onClick={handleEditar}
            disabled={enCurso}
            className="w-full border border-primary text-primary hover:bg-primary-tint disabled:opacity-60 rounded-lg py-2 text-[13px] font-semibold transition-colors"
          >
            Editar en Generar pedido
          </button>
          <p className="text-[11px] text-muted text-center">
            {expirado ? 'El tiempo para confirmar expiró.' : `Expira en ${restantes}s`}
          </p>
        </div>
      )}
    </div>
  );
}
