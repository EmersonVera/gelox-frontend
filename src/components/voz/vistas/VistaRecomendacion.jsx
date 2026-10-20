import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { descargarExportacionPedido } from '../../../services/vozService';
import { formatoCOP } from '../formato';
import useCuentaRegresiva from './useCuentaRegresiva';

/**
 * Vista de RF55 por voz dentro de PanelAsistenteVoz (dropdown angosto, una columna).
 * - CONSULTAR_RECOMENDACION: los 3 primeros ítems, costo total y "Ver completa".
 * - DECIDIR_RECOMENDACION: el cambio pedido con Confirmar / Cancelar y contador,
 *   igual que VistaModificarPedido. Si la acción fue GENERAR_PEDIDO y se completó:
 *   "Pedido registrado" y "Descargar Excel".
 */

const URGENCIA = {
  CRITICO: { label: 'Crítico', pill: 'bg-error-bg text-error-fg' },
  ALERTA: { label: 'Alerta', pill: 'bg-amber-50 text-amber-700' },
  ESTABLE: { label: 'Estable', pill: 'bg-success-bg text-success-fg' },
};

const ACCION = {
  APROBAR: { label: 'Aprobar', pill: 'bg-success-bg text-success-fg' },
  MODIFICAR: { label: 'Modificar', pill: 'bg-amber-50 text-amber-700' },
  RECHAZAR: { label: 'Rechazar', pill: 'bg-error-bg text-error-fg' },
  GENERAR_PEDIDO: { label: 'Generar pedido', pill: 'bg-primary-tint text-primary' },
};

const botonPrimario =
  'flex-1 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white rounded-lg py-2 text-[13px] font-semibold transition-colors';
const botonSecundario =
  'flex-1 bg-white border border-border hover:bg-surface text-ink rounded-lg py-2 text-[13px] font-semibold transition-colors';

function Pill({ info }) {
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${info.pill}`}>
      {info.label}
    </span>
  );
}

function rutaRecomendacion(recomendacionId) {
  return recomendacionId ? `/inventarios/recomendaciones?id=${recomendacionId}` : '/inventarios/recomendaciones';
}

function Consulta({ datos, textoRespuesta }) {
  const navigate = useNavigate();
  const items = datos.items ?? [];
  const primeros = items.slice(0, 3);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Recomendación de compra</span>
        <span className="text-[11px] text-muted shrink-0">Presupuesto {formatoCOP(datos.presupuesto)}</span>
      </div>

      {primeros.length === 0 ? (
        <p className="text-[13px] text-ink leading-snug">{textoRespuesta}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
          {primeros.map((item) => (
            <li key={item.itemId} className="flex items-center gap-2 px-3 py-2">
              <Pill info={URGENCIA[item.urgencia] ?? URGENCIA.ESTABLE} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink truncate">{item.producto}</p>
                <p className="text-[11px] text-muted">{item.cajas} cajas</p>
              </div>
              <span className="text-[12px] font-semibold text-ink shrink-0">{formatoCOP(item.costo)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted">
          {items.length > 3 ? `y ${items.length - 3} más · ` : ''}{items.length} productos
        </span>
        <span className="text-ink">
          Total <span className="font-bold">{formatoCOP(datos.costoTotal)}</span>
        </span>
      </div>

      {datos.excluidos?.length > 0 && (
        <p className="text-[11px] text-muted">Quedaron fuera por presupuesto: {datos.excluidos.join(', ')}.</p>
      )}

      <button type="button" onClick={() => navigate(rutaRecomendacion(datos.recomendacionId))} className={botonSecundario}>
        Ver completa
      </button>
    </div>
  );
}

function Decision({ respuesta, onConfirmar, onCancelar }) {
  const navigate = useNavigate();
  const { datos, textoRespuesta, requiereConfirmacion, expiraEnSegundos, cancelado } = respuesta;
  const [enCurso, setEnCurso] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  const completado = !!datos?.completado;
  const pendiente = !!requiereConfirmacion && !completado && !cancelado;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;

  // Sin datos: cancelado, expirado (410) o no se pudo preparar la decisión.
  if (!datos?.accion) {
    return <p className="text-[13px] text-ink leading-snug">{textoRespuesta || 'No se pudo aplicar la decisión.'}</p>;
  }

  const accion = ACCION[datos.accion] ?? { label: datos.accion, pill: 'bg-surface text-muted' };
  const esPedido = datos.accion === 'GENERAR_PEDIDO';

  // Confirmar por voz o con el botón va por el mismo camino (useAsistenteVoz).
  const accionBoton = (fn) => async () => {
    setEnCurso(true);
    try {
      await fn?.();
    } finally {
      setEnCurso(false);
    }
  };

  const descargar = async () => {
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
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Recomendación de compra</span>
        <Pill info={accion} />
      </div>

      {esPedido ? (
        <p className="text-[13px] text-ink">
          <span className="font-semibold">{datos.totalItems} {datos.totalItems === 1 ? 'producto' : 'productos'}</span> · {datos.cajas} cajas ·{' '}
          <span className="font-semibold">{formatoCOP(datos.costo)}</span>
        </p>
      ) : (
        <div>
          <p className="text-[13px] font-semibold text-ink">{datos.producto}</p>
          <p className="text-[12px] text-muted">
            {datos.cajasSugeridas} cajas sugeridas →{' '}
            <span className="font-semibold text-ink">{datos.cajas} cajas</span>
            {datos.accion === 'MODIFICAR' && datos.cajas === 0 && ' (queda rechazado)'}
          </p>
        </div>
      )}

      {error && <p className="text-[12px] text-danger">{error}</p>}

      {completado && esPedido && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[13px] font-semibold text-success-fg">✓ Pedido registrado</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate(`/inventarios/pedidos/${datos.pedidoId}`)} className={botonSecundario}>
              Ver pedido
            </button>
            <button type="button" onClick={descargar} disabled={descargando || !datos.exportUrl} className={botonPrimario}>
              {descargando ? 'Descargando…' : 'Descargar Excel'}
            </button>
          </div>
        </div>
      )}

      {completado && !esPedido && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[13px] font-semibold text-success-fg">✓ {textoRespuesta || 'Decisión guardada'}</p>
          <button type="button" onClick={() => navigate(rutaRecomendacion(datos.recomendacionId))} className={botonSecundario}>
            Ver recomendación
          </button>
        </div>
      )}

      {!completado && (cancelado || !pendiente) && (
        <p className="text-[13px] text-muted pt-1">{textoRespuesta || 'Decisión cancelada.'}</p>
      )}

      {pendiente && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <button type="button" onClick={accionBoton(onConfirmar)} disabled={enCurso || expirado} className={botonPrimario}>
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
          <p className="text-[11px] text-muted text-center">
            {expirado ? 'El tiempo para confirmar expiró. Repite el comando.' : `Expira en ${restantes}s`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function VistaRecomendacion({ respuesta, onConfirmar, onCancelar }) {
  const { intencion, ok, datos, textoRespuesta } = respuesta;

  // Flujo alterno: sin recomendación abierta, producto que no está, sin aprobados…
  if (ok === false || !datos) {
    return <p className="text-[13px] text-ink leading-snug">{textoRespuesta || 'No se pudo atender la solicitud.'}</p>;
  }
  if (intencion === 'CONSULTAR_RECOMENDACION') {
    return <Consulta datos={datos} textoRespuesta={textoRespuesta} />;
  }
  return <Decision respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
}
