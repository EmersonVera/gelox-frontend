// Datos simulados del módulo de recomendación de compras (RF54–RF57).
// Respeta la forma del contrato del backend (entidades RecomendacionCompra e
// ItemRecomendacion, migración V6). Guarda el estado en memoria mientras la
// pestaña siga abierta, para que aprobar, modificar o generar el pedido se
// reflejen en el historial y las métricas.
//
// Recomendación:
//   { id, presupuesto, costoTotal, costoAprobado, margenTotal, estado, origen,
//     confianzaBaja, diasHistorial, diasConVentas, pedidoProveedorId, createdAt,
//     usuario: { nombre }, items: [Item], excluidos: [{ productoId, nombre, costoEstimado }] }
// Item:
//   { id, prioridad, producto: { id, codigo, nombre, unidadesPorCaja }, urgencia,
//     score, demandaDiaria, factorEstacionalidad, stockSeguridad, puntoReorden,
//     stockActual, coberturaDias, unidadesSugeridas, cajasSugeridas, ajustePresupuesto,
//     costoEstimado, margenEsperado, justificacion, decision, cajasAprobadas,
//     motivoRechazo, fechaDecision, confianzaBaja, mesesHistorial }

const DEMORA_MS = 400;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje } } });

let secuencia = 31;
const nuevoId = (prefijo) => `${prefijo}-${crypto.randomUUID()}`;

/* Catálogo base: 2 críticos, 2 en alerta y 2 estables (orden = prioridad). */
const BASE = [
  {
    producto: { id: 'prod-pd-012', codigo: 'PD-012', nombre: 'Paleta Drácula', unidadesPorCaja: 24 },
    urgencia: 'CRITICO', score: 92.5, demandaDiaria: 130.3, factorEstacionalidad: 1.18,
    stockSeguridad: 144, puntoReorden: 600, stockActual: 192, coberturaDias: 1.5,
    cajasSugeridas: 40, costoCaja: 32000, margenCaja: 9600, mesesHistorial: 4,
    justificacion:
      'El stock (8 cajas) está por debajo del punto de reorden (25 cajas). Con la venta promedio de los últimos 4 meses y el alza de temporada de octubre, se agotaría en menos de 2 días. Las 40 cajas cubren una semana de venta más el stock de seguridad.',
  },
  {
    producto: { id: 'prod-fe-004', codigo: 'FE-004', nombre: 'Festival', unidadesPorCaja: 12 },
    urgencia: 'CRITICO', score: 88.1, demandaDiaria: 45.0, factorEstacionalidad: 1.12,
    stockSeguridad: 72, puntoReorden: 264, stockActual: 60, coberturaDias: 1.3,
    cajasSugeridas: 30, costoCaja: 22000, margenCaja: 6600, mesesHistorial: 4,
    justificacion:
      'Quedan 5 cajas, menos de la mitad del punto de reorden (22 cajas). La demanda subió 12 % frente al mes anterior. Las 30 cajas reponen hasta el stock objetivo de 7 días.',
  },
  {
    producto: { id: 'prod-cn-008', codigo: 'CN-008', nombre: 'Cono Crem Helado Arequipe', unidadesPorCaja: 12 },
    urgencia: 'ALERTA', score: 71.4, demandaDiaria: 40.1, factorEstacionalidad: 1.08,
    stockSeguridad: 72, puntoReorden: 300, stockActual: 264, coberturaDias: 6.6,
    cajasSugeridas: 25, costoCaja: 40000, margenCaja: 11200, mesesHistorial: 4,
    justificacion:
      'El stock (22 cajas) está cerca del punto de reorden (25 cajas). Al ritmo actual se alcanza en 1 día. Se sugieren 25 cajas para no quedar por debajo del mínimo durante la semana.',
  },
  {
    producto: { id: 'prod-lf-002', codigo: 'LF-002', nombre: 'Litro Fresa', unidadesPorCaja: 6 },
    urgencia: 'ALERTA', score: 64.9, demandaDiaria: 18.7, factorEstacionalidad: 1.05,
    stockSeguridad: 30, puntoReorden: 160, stockActual: 150, coberturaDias: 8.0,
    cajasSugeridas: 18, costoCaja: 45000, margenCaja: 11700, mesesHistorial: 2,
    justificacion:
      'El stock (25 cajas) está a una caja del punto de reorden. Solo hay 2 meses de historial, así que la demanda se estimó con datos limitados: revisa la cantidad antes de aprobar.',
  },
  {
    producto: { id: 'prod-bp-030', codigo: 'BP-030', nombre: 'Brownie Polet', unidadesPorCaja: 24 },
    urgencia: 'ESTABLE', score: 48.2, demandaDiaria: 51.4, factorEstacionalidad: 1.0,
    stockSeguridad: 96, puntoReorden: 456, stockActual: 960, coberturaDias: 18.7,
    cajasSugeridas: 15, costoCaja: 46000, margenCaja: 11500, mesesHistorial: 2,
    justificacion:
      'Stock estable (40 cajas) con cobertura de casi 3 semanas. Se sugiere una reposición moderada por su margen alto. Historial de solo 2 meses: confianza baja.',
  },
  {
    producto: { id: 'prod-pm-019', codigo: 'PM-019', nombre: 'Paleta Mango Biche', unidadesPorCaja: 24 },
    urgencia: 'ESTABLE', score: 45.0, demandaDiaria: 62.0, factorEstacionalidad: 1.02,
    stockSeguridad: 120, puntoReorden: 560, stockActual: 1104, coberturaDias: 17.8,
    cajasSugeridas: 16, costoCaja: 35000, margenCaja: 10150, mesesHistorial: 4,
    justificacion:
      'Stock estable (46 cajas). Se repone de forma preventiva porque es el producto de mayor rotación del canal comerciantes y su margen es de 29 %.',
  },
];

const store = new Map();

const costoDeItem = (item) => {
  const cajas = item.decision === 'MODIFICADO' ? item.cajasAprobadas : item.cajasSugeridas;
  return item.decision === 'RECHAZADO' ? 0 : cajas * item.costoCaja;
};

function recalcular(rec) {
  rec.costoTotal = rec.items.reduce((s, i) => s + i.costoEstimado, 0);
  rec.margenTotal = rec.items.reduce((s, i) => s + i.margenEsperado, 0);
  rec.costoAprobado = rec.items
    .filter((i) => i.decision === 'APROBADO' || i.decision === 'MODIFICADO')
    .reduce((s, i) => s + costoDeItem(i), 0);
  const hayDecisiones = rec.items.some((i) => i.decision !== 'PENDIENTE');
  if (rec.estado === 'GENERADA' && hayDecisiones) rec.estado = 'EN_REVISION';
  return rec;
}

function crearRecomendacion(presupuesto, { createdAt = new Date(), usuario = 'Carlos Pérez' } = {}) {
  let acumulado = 0;
  const items = [];
  const excluidos = [];

  BASE.forEach((b) => {
    const costo = b.cajasSugeridas * b.costoCaja;
    if (acumulado + costo > presupuesto) {
      excluidos.push({ productoId: b.producto.id, nombre: b.producto.nombre, costoEstimado: costo });
      return;
    }
    acumulado += costo;
    items.push({
      id: nuevoId('item'),
      prioridad: items.length + 1,
      producto: { ...b.producto },
      urgencia: b.urgencia,
      score: b.score,
      demandaDiaria: b.demandaDiaria,
      factorEstacionalidad: b.factorEstacionalidad,
      stockSeguridad: b.stockSeguridad,
      puntoReorden: b.puntoReorden,
      stockActual: b.stockActual,
      coberturaDias: b.coberturaDias,
      unidadesSugeridas: b.cajasSugeridas * b.producto.unidadesPorCaja,
      cajasSugeridas: b.cajasSugeridas,
      ajustePresupuesto: 'COMPLETO',
      costoEstimado: costo,
      margenEsperado: b.cajasSugeridas * b.margenCaja,
      costoCaja: b.costoCaja,
      justificacion: b.justificacion,
      decision: 'PENDIENTE',
      cajasAprobadas: null,
      motivoRechazo: null,
      fechaDecision: null,
      confianzaBaja: b.mesesHistorial < 3,
      mesesHistorial: b.mesesHistorial,
    });
  });

  secuencia += 1;
  const rec = {
    id: nuevoId('rec'),
    codigo: `REC-${String(secuencia).padStart(4, '0')}`,
    presupuesto,
    costoTotal: 0,
    costoAprobado: 0,
    margenTotal: 0,
    estado: 'GENERADA',
    origen: 'PANTALLA',
    confianzaBaja: items.some((i) => i.confianzaBaja),
    diasHistorial: 120,
    diasConVentas: 104,
    pedidoProveedorId: null,
    createdAt: createdAt.toISOString(),
    usuario: { nombre: usuario },
    items,
    excluidos,
  };
  store.set(rec.id, recalcular(rec));
  return rec;
}

/* Historial de ejemplo: recomendaciones de semanas anteriores. */
(function sembrarHistorial() {
  const dias = [3, 10, 17, 24, 31, 38, 45];
  dias.forEach((d, idx) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - d);
    const rec = crearRecomendacion(4000000 + idx * 600000, {
      createdAt: fecha,
      usuario: idx % 2 === 0 ? 'Carlos Pérez' : 'Ayde Arévalo',
    });
    rec.items.forEach((item, i) => {
      if (i % 4 === 3) {
        item.decision = 'RECHAZADO';
        item.motivoRechazo = 'Stock suficiente en bodega';
      } else if (i % 3 === 2) {
        item.decision = 'MODIFICADO';
        item.cajasAprobadas = Math.max(1, item.cajasSugeridas - 5);
      } else {
        item.decision = 'APROBADO';
        item.cajasAprobadas = item.cajasSugeridas;
      }
      item.fechaDecision = rec.createdAt;
    });
    recalcular(rec);
    if (idx !== 1) {
      rec.estado = 'PEDIDO_GENERADO';
      rec.pedidoProveedorId = nuevoId('ped');
    } else {
      rec.estado = 'DESCARTADA';
    }
  });
})();

/* ── Funciones simuladas (misma firma que recomendacionService) ── */

export function generar(presupuesto) {
  const valor = Number(presupuesto);
  if (!Number.isFinite(valor) || valor <= 0) {
    return Promise.reject(errorHttp(400, 'El presupuesto debe ser mayor a 0'));
  }
  return esperar(crearRecomendacion(valor));
}

export function obtener(id) {
  const rec = store.get(id);
  if (!rec) return Promise.reject(errorHttp(404, 'Recomendación no encontrada'));
  return esperar(rec);
}

export function decidir(id, itemId, { decision, cajas, motivo }) {
  const rec = store.get(id);
  if (!rec) return Promise.reject(errorHttp(404, 'Recomendación no encontrada'));
  if (rec.estado === 'PEDIDO_GENERADO') {
    return Promise.reject(errorHttp(409, 'La recomendación ya se convirtió en pedido'));
  }
  const item = rec.items.find((i) => i.id === itemId);
  if (!item) return Promise.reject(errorHttp(404, 'Ítem no encontrado'));

  // Modificar a 0 cajas equivale a rechazar el ítem.
  const decisionFinal = decision === 'MODIFICADO' && Number(cajas) === 0 ? 'RECHAZADO' : decision;
  item.decision = decisionFinal;
  item.cajasAprobadas = {
    APROBADO: item.cajasSugeridas,
    MODIFICADO: Number(cajas),
    RECHAZADO: 0,
    PENDIENTE: null,
  }[decisionFinal];
  item.motivoRechazo = decisionFinal === 'RECHAZADO'
    ? (motivo || (decision === 'MODIFICADO' ? 'Cantidad modificada a 0' : null))
    : null;
  item.fechaDecision = new Date().toISOString();
  return esperar(recalcular(rec));
}

export function pedido(id) {
  const rec = store.get(id);
  if (!rec) return Promise.reject(errorHttp(404, 'Recomendación no encontrada'));
  if (rec.estado === 'PEDIDO_GENERADO') {
    return Promise.reject(errorHttp(409, 'La recomendación ya se convirtió en pedido'));
  }
  const aprobados = rec.items.filter((i) => i.decision === 'APROBADO' || i.decision === 'MODIFICADO');
  if (aprobados.length === 0) {
    return Promise.reject(errorHttp(422, 'No hay ítems aprobados para generar el pedido'));
  }
  rec.estado = 'PEDIDO_GENERADO';
  rec.pedidoProveedorId = nuevoId('ped');
  return esperar({
    pedidoId: rec.pedidoProveedorId,
    exportUrl: null, // en modo simulado no hay archivo en el servidor
    totalItems: aprobados.length,
    costoAprobado: rec.costoAprobado,
  });
}

const enRango = (rec, desde, hasta) => {
  const fecha = rec.createdAt.slice(0, 10);
  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
};

const resumen = (rec) => ({
  id: rec.id,
  codigo: rec.codigo,
  createdAt: rec.createdAt,
  usuario: rec.usuario,
  origen: rec.origen,
  estado: rec.estado,
  presupuesto: rec.presupuesto,
  costoTotal: rec.costoTotal,
  costoAprobado: rec.costoAprobado,
  totalItems: rec.items.length,
  itemsAprobados: rec.items.filter((i) => i.decision === 'APROBADO' || i.decision === 'MODIFICADO').length,
  pedidoProveedorId: rec.pedidoProveedorId,
});

export function historial({ desde, hasta, page = 0, size = 10 } = {}) {
  const lista = [...store.values()]
    .filter((r) => enRango(r, desde, hasta))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(resumen);
  return esperar({
    content: lista.slice(page * size, (page + 1) * size),
    totalElements: lista.length,
    totalPages: Math.max(1, Math.ceil(lista.length / size)),
    page,
  });
}

export function metricas(desde, hasta) {
  const recs = [...store.values()].filter((r) => enRango(r, desde, hasta));
  const items = recs.flatMap((r) => r.items);
  const decididos = items.filter((i) => i.decision !== 'PENDIENTE');
  const aceptados = decididos.filter((i) => i.decision !== 'RECHAZADO');
  const convertidas = recs.filter((r) => r.estado === 'PEDIDO_GENERADO');
  const pct = (a, b) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);

  return esperar({
    totalRecomendaciones: recs.length,
    convertidasEnPedido: convertidas.length,
    tasaConversion: pct(convertidas.length, recs.length),
    tasaAceptacion: pct(aceptados.length, decididos.length),
    itemsModificados: decididos.filter((i) => i.decision === 'MODIFICADO').length,
    itemsRechazados: decididos.filter((i) => i.decision === 'RECHAZADO').length,
    costoAprobadoTotal: convertidas.reduce((s, r) => s + r.costoAprobado, 0),
    presupuestoPromedio: recs.length === 0 ? null
      : Math.round(recs.reduce((s, r) => s + r.presupuesto, 0) / recs.length),
  });
}
