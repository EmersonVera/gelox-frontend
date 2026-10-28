import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerRecomendacion } from '../../../services/recomendacionService';
import { descargarExportacionPedido } from '../../../services/vozService';
import { formatoCOP } from '../formato';
import useCuentaRegresiva from './useCuentaRegresiva';

/**
 * Vista de RF55 por voz dentro de PanelAsistenteVoz (dropdown angosto, una columna).
 *
 * El backend solo manda ids en `datos` ({ recomendacionId, itemId? }); el detalle se lee con
 * GET /api/recomendaciones/{id} y el cambio propuesto viene redactado en textoRespuesta.
 * - CONSULTAR_RECOMENDACION: los 3 primeros ítems con cajas, costo total y "Ver completa".
 * - DECIDIR_RECOMENDACION: el cambio pedido con Confirmar / Cancelar y el contador de
 *   expiraEnSegundos, igual que VistaModificarPedido. Al confirmar GENERAR_PEDIDO llegan
 *   pedidoId y exportUrl: "Pedido registrado" y "Descargar Excel".
 * - ok === false (sin recomendación de hoy, producto que no está, sin aprobados, ya
 *   convertida en pedido): solo el textoRespuesta, sin botones.
 */

const URGENCIA = {
  CRITICO: { label: 'Crítico', pill: 'bg-error-bg text-error-fg' },
  ALERTA: { label: 'Alerta', pill: 'bg-amber-50 text-amber-700' },
  ESTABLE: { label: 'Estable', pill: 'bg-success-bg text-success-fg' },
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

function Encabezado({ children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Recomendación de compra</span>
      {children}
    </div>
  );
}

function rutaRecomendacion(recomendacionId) {
  return recomendacionId ? `/inventarios/recomendaciones?id=${recomendacionId}` : '/inventarios/recomendaciones';
}

/** Lee la recomendación por id. Sin id no consulta nada. */
function useRecomendacion(id) {
  const [estado, setEstado] = useState({ id: null, rec: null, fallo: false });

  useEffect(() => {
    if (!id) return undefined;
    let vivo = true;
    obtenerRecomendacion(id)
      .then((rec) => { if (vivo) setEstado({ id, rec, fallo: false }); })
      .catch(() => { if (vivo) setEstado({ id, rec: null, fallo: true }); });
    return () => { vivo = false; };
  }, [id]);

  const vigente = estado.id === id;
  return { rec: vigente ? estado.rec : null, cargando: !!id && !vigente, fallo: vigente && estado.fallo };
}

/** Ítems que van a la compra (los EXCLUIDO traen 0 cajas), igual que la narración del backend. */
const conCajas = (rec) =>
  (rec?.items ?? []).filter((i) => i.ajustePresupuesto !== 'EXCLUIDO' && i.cajasSugeridas > 0);

function Consulta({ datos, textoRespuesta }) {
  const navigate = useNavigate();
  const { rec, cargando } = useRecomendacion(datos.recomendacionId);
  const items = conCajas(rec);
  const primeros = items.slice(0, 3);

  return (
    <div className="flex flex-col gap-2.5">
      <Encabezado>
        {rec && <span className="text-[11px] text-muted shrink-0">Presupuesto {formatoCOP(rec.presupuesto)}</span>}
      </Encabezado>

      {cargando && <div className="h-[92px] rounded-xl bg-surface animate-pulse" />}

      {!cargando && primeros.length === 0 && (
        <p className="text-[13px] text-ink leading-snug">{textoRespuesta}</p>
      )}

      {primeros.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
            {primeros.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                <Pill info={URGENCIA[item.urgencia] ?? URGENCIA.ESTABLE} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink truncate">{item.productoNombre}</p>
                  <p className="text-[11px] text-muted">
                    {item.cajasSugeridas} {item.cajasSugeridas === 1 ? 'caja' : 'cajas'}
                    {item.ajustePresupuesto === 'REDUCIDO' && ' · reducido'}
                  </p>
                </div>
                <span className="text-[12px] font-semibold text-ink shrink-0">{formatoCOP(item.costoEstimado)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted">
              {items.length > 3 ? `y ${items.length - 3} más · ` : ''}{items.length} productos
            </span>
            <span className="text-ink">
              Total <span className="font-bold">{formatoCOP(rec.costoTotal)}</span>
            </span>
          </div>
          {rec.confianzaBaja && (
            <p className="text-[11px] text-amber-700">Confianza baja: hay poco historial de ventas.</p>
          )}
        </>
      )}

      <button type="button" onClick={() => navigate(rutaRecomendacion(datos.recomendacionId))} className={botonSecundario}>
        Ver completa
      </button>
    </div>
  );
}

/** Producto sobre el que se decide; solo cuando la respuesta trae itemId. */
function ItemDecidido({ recomendacionId, itemId }) {
  const { rec } = useRecomendacion(itemId ? recomendacionId : null);
  const item = rec?.items?.find((i) => i.id === itemId);
  if (!item) return null;
  return (
    <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2">
      <Pill info={URGENCIA[item.urgencia] ?? URGENCIA.ESTABLE} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink truncate">{item.productoNombre}</p>
        <p className="text-[11px] text-muted">
          Sugeridas: {item.cajasSugeridas} {item.cajasSugeridas === 1 ? 'caja' : 'cajas'}
          {item.ajustePresupuesto === 'EXCLUIDO' && ' · excede el presupuesto'}
        </p>
      </div>
      <span className="text-[12px] font-semibold text-ink shrink-0">{formatoCOP(item.costoEstimado)}</span>
    </div>
  );
}

function Decision({ respuesta, onConfirmar, onCancelar }) {
  const navigate = useNavigate();
  const { datos = {}, textoRespuesta, requiereConfirmacion, expiraEnSegundos, cancelado } = respuesta;
  const [enCurso, setEnCurso] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState('');

  const pendiente = !!requiereConfirmacion && !cancelado;
  const restantes = useCuentaRegresiva(expiraEnSegundos, pendiente);
  const expirado = pendiente && restantes === 0;
  const pedidoRegistrado = !pendiente && !cancelado && !!datos.pedidoId;
  const decisionGuardada = !pendiente && !cancelado && !datos.pedidoId;

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
      <Encabezado />

      {pendiente && (
        <>
          <p className="text-[13px] text-ink leading-snug">{textoRespuesta}</p>
          <ItemDecidido recomendacionId={datos.recomendacionId} itemId={datos.itemId} />
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
              {expirado ? 'El tiempo para confirmar expiró. Repite el comando.' : `Expira en ${restantes ?? '—'}s`}
            </p>
          </div>
        </>
      )}

      {cancelado && <p className="text-[13px] text-muted">{textoRespuesta || 'Decisión cancelada.'}</p>}

      {pedidoRegistrado && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-success-fg">✓ Pedido registrado</p>
          {error && <p className="text-[12px] text-danger">{error}</p>}
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

      {decisionGuardada && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-success-fg">✓ {textoRespuesta || 'Decisión guardada'}</p>
          <button type="button" onClick={() => navigate(rutaRecomendacion(datos.recomendacionId))} className={botonSecundario}>
            Ver recomendación
          </button>
        </div>
      )}
    </div>
  );
}

export default function VistaRecomendacion({ respuesta, onConfirmar, onCancelar }) {
  const { intencion, ok, datos, textoRespuesta } = respuesta;

  // Flujo alterno: el backend responde ok=false y datos vacíos; no hay nada que confirmar.
  if (ok === false || !datos?.recomendacionId) {
    return <p className="text-[13px] text-ink leading-snug">{textoRespuesta || 'No se pudo atender la solicitud.'}</p>;
  }
  if (intencion === 'CONSULTAR_RECOMENDACION') {
    return <Consulta datos={datos} textoRespuesta={textoRespuesta} />;
  }
  return <Decision respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
}
