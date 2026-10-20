// Mock de voz para RF55 (CONSULTAR_RECOMENDACION y DECIDIR_RECOMENDACION).
// Sigue el contrato de vozMock.js: coincide(texto), interpretar(texto, confianza)
// y confirmar(comandoId, confirmar); se registra solo vía import.meta.glob.
//
// Usa el mismo almacén en memoria que la pantalla (mockRecomendacion.js), así
// "Ver completa" abre la recomendación con las decisiones tomadas por voz.
//
// Respuestas:
//   CONSULTAR_RECOMENDACION (sin confirmación):
//     datos: { recomendacionId, presupuesto, costoTotal, totalItems, excluidos,
//              items: [{ itemId, prioridad, urgencia, producto, cajas, costo }] }
//   DECIDIR_RECOMENDACION (pide confirmación, expira en 15 s):
//     datos: { recomendacionId, accion, itemId?, producto?, urgencia?, cajasSugeridas?, cajas?,
//              totalItems?, costo? }
//     al confirmar se agrega { completado: true } y, si la acción fue GENERAR_PEDIDO,
//     { pedidoId, exportUrl }.
import { fraseRecomendacion } from '../../hooks/frasesVoz.js';
import { decidir, generar, obtener, pedido } from './mockRecomendacion.js';

/** Se pregunta antes que al resto de mocks: "genera el pedido" también encaja en mockGenerarPedido. */
export const prioridad = 1;

const EXPIRA_EN_SEGUNDOS = 15;
const PRESUPUESTO_POR_DEFECTO = 8_500_000;

const DECISION_POR_ACCION = { APROBAR: 'APROBADO', MODIFICAR: 'MODIFICADO', RECHAZAR: 'RECHAZADO' };
const VERBO_POR_ACCION = { APROBAR: 'aprobar', MODIFICAR: 'cambiar', RECHAZAR: 'rechazar' };

let contador = 0;
let recomendacionActivaId = null;
const pendientes = new Map(); // comandoId → { expiraEn, datos }

const pesos = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const errorHttp = (status, mensaje) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje } } });

const normalizar = (texto) => (texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const cajasDeItem = (i) => {
  if (i.decision === 'RECHAZADO') return 0;
  return i.decision === 'MODIFICADO' ? i.cajasAprobadas : i.cajasSugeridas;
};
const costoDeItem = (i) => cajasDeItem(i) * (i.costoEstimado / i.cajasSugeridas);

export function coincide(texto) {
  const frase = fraseRecomendacion(texto);
  if (!frase) return false;
  // Sin recomendación abierta, "genera el pedido" sigue siendo el pedido a proveedor de siempre.
  return frase.accion !== 'GENERAR_PEDIDO' || recomendacionActivaId !== null;
}

function respuestaError(comandoId, intencion, textoRespuesta) {
  return { comandoId, ok: false, intencion, requiereConfirmacion: false, expiraEnSegundos: null, textoRespuesta, datos: null };
}

async function consultar(comandoId, presupuestoDicho) {
  const presupuesto = presupuestoDicho ?? PRESUPUESTO_POR_DEFECTO;
  const rec = await generar(presupuesto);
  recomendacionActivaId = rec.id;

  const items = rec.items.map((i) => ({
    itemId: i.id,
    prioridad: i.prioridad,
    urgencia: i.urgencia,
    producto: i.producto.nombre,
    cajas: i.cajasSugeridas,
    costo: i.costoEstimado,
  }));
  const primero = items[0];
  const textoRespuesta = items.length === 0
    ? `Con ${pesos(presupuesto)} no alcanza para ningún producto recomendado.`
    : `Con ${pesos(presupuesto)} te recomiendo ${items.length} productos por ${pesos(rec.costoTotal)}. `
      + `Lo más urgente: ${primero.cajas} cajas de ${primero.producto}.`
      + (presupuestoDicho ? '' : ' Usé el presupuesto de la semana porque no dijiste uno.');

  return {
    comandoId,
    ok: true,
    intencion: 'CONSULTAR_RECOMENDACION',
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta,
    datos: {
      recomendacionId: rec.id,
      presupuesto,
      costoTotal: rec.costoTotal,
      totalItems: items.length,
      excluidos: rec.excluidos.map((e) => e.nombre),
      items,
    },
  };
}

function buscarItem(rec, fragmento) {
  const buscado = normalizar(fragmento);
  return rec.items.find((i) => {
    const nombre = normalizar(i.producto.nombre);
    return nombre.includes(buscado) || buscado.includes(nombre);
  });
}

function pedirConfirmacion(comandoId, textoRespuesta, datos) {
  pendientes.set(comandoId, { expiraEn: Date.now() + EXPIRA_EN_SEGUNDOS * 1000, datos });
  return {
    comandoId,
    ok: true,
    intencion: 'DECIDIR_RECOMENDACION',
    requiereConfirmacion: true,
    expiraEnSegundos: EXPIRA_EN_SEGUNDOS,
    textoRespuesta,
    datos,
  };
}

async function prepararDecision(comandoId, frase) {
  const intencion = 'DECIDIR_RECOMENDACION';
  if (!recomendacionActivaId) {
    return respuestaError(comandoId, intencion,
      'Primero pide una recomendación, por ejemplo: "¿Qué me recomiendas pedir con dos millones?".');
  }
  const rec = await obtener(recomendacionActivaId);
  if (rec.estado === 'PEDIDO_GENERADO') {
    return respuestaError(comandoId, intencion, 'Esa recomendación ya se convirtió en pedido. Pide una nueva.');
  }

  if (frase.accion === 'GENERAR_PEDIDO') {
    const aprobados = rec.items.filter((i) => i.decision === 'APROBADO' || i.decision === 'MODIFICADO');
    if (aprobados.length === 0) {
      return respuestaError(comandoId, intencion,
        'Aún no hay productos aprobados. Di por ejemplo "aprueba el Festival" y luego "genera el pedido".');
    }
    const cajas = aprobados.reduce((s, i) => s + cajasDeItem(i), 0);
    const costo = aprobados.reduce((s, i) => s + costoDeItem(i), 0);
    return pedirConfirmacion(comandoId,
      `Voy a generar el pedido con ${aprobados.length} ${aprobados.length === 1 ? 'producto' : 'productos'}, ${cajas} cajas, por ${pesos(costo)}. ¿Confirmas?`,
      { recomendacionId: rec.id, accion: 'GENERAR_PEDIDO', totalItems: aprobados.length, cajas, costo });
  }

  const item = buscarItem(rec, frase.producto);
  if (!item) {
    return respuestaError(comandoId, intencion, `No encontré "${frase.producto}" en la recomendación.`);
  }
  const cajas = { APROBAR: item.cajasSugeridas, MODIFICAR: frase.cajas, RECHAZAR: 0 }[frase.accion];
  const nota = frase.accion === 'MODIFICAR' && cajas === 0 ? ' Con 0 cajas queda rechazado.' : '';
  return pedirConfirmacion(comandoId,
    `Voy a ${VERBO_POR_ACCION[frase.accion]} ${item.producto.nombre}: ${cajas} cajas (sugeridas: ${item.cajasSugeridas}).${nota} ¿Confirmas?`,
    {
      recomendacionId: rec.id,
      accion: frase.accion,
      itemId: item.id,
      producto: item.producto.nombre,
      urgencia: item.urgencia,
      cajasSugeridas: item.cajasSugeridas,
      cajas,
    });
}

export async function interpretar(texto) {
  contador += 1;
  const comandoId = `mock-recomendacion-${contador}`;
  const frase = fraseRecomendacion(texto);
  return frase.intencion === 'CONSULTAR_RECOMENDACION'
    ? consultar(comandoId, frase.presupuesto)
    : prepararDecision(comandoId, frase);
}

export async function confirmar(comandoId, confirmarValor) {
  const pendiente = pendientes.get(comandoId);
  pendientes.delete(comandoId);
  if (!pendiente) throw errorHttp(404, 'No hay un comando pendiente de confirmación con ese id');
  if (Date.now() > pendiente.expiraEn) throw errorHttp(410, 'La confirmación expiró. Repite el comando.');

  const base = { comandoId, intencion: 'DECIDIR_RECOMENDACION', requiereConfirmacion: false, expiraEnSegundos: null };
  if (!confirmarValor) return { ...base, textoRespuesta: 'Decisión cancelada. No se cambió nada.', datos: null };

  const { datos } = pendiente;
  if (datos.accion === 'GENERAR_PEDIDO') {
    const resultado = await pedido(datos.recomendacionId);
    recomendacionActivaId = null;
    return {
      ...base,
      textoRespuesta: 'Pedido registrado en estado Pendiente. Ya puedes descargar el archivo.',
      datos: {
        completado: true,
        pedidoId: resultado.pedidoId,
        exportUrl: `/api/inventario/pedidos/${resultado.pedidoId}/exportar`,
      },
    };
  }

  const rec = await decidir(datos.recomendacionId, datos.itemId,
    { decision: DECISION_POR_ACCION[datos.accion], cajas: datos.cajas });
  const item = rec.items.find((i) => i.id === datos.itemId);
  const textos = {
    APROBADO: `Listo, aprobé ${item.producto.nombre}.`,
    MODIFICADO: `Listo, ${item.producto.nombre} queda en ${item.cajasAprobadas} cajas.`,
    RECHAZADO: `Listo, rechacé ${item.producto.nombre}.`,
  };
  return { ...base, textoRespuesta: textos[item.decision], datos: { completado: true, decisionFinal: item.decision } };
}
