// Datos simulados del módulo de recomendación de compras (RF54–RF57). Se activan con
// VITE_USAR_MOCK_RECOMENDACION=true. Respetan la forma de los DTO del backend
// (RecomendacionGeneradaDTO, RecomendacionDTO, ItemDTO, PedidoGeneradoDTO,
// RecomendacionResumenDTO, MetricasRecomendacionDTO) y reparten el presupuesto igual que
// MotorRecomendacionCompra: por prioridad, COMPLETO si cabe, REDUCIDO a las cajas que
// alcancen y EXCLUIDO (0 cajas) si no alcanza ni una.
//
//   $170.000 → Limón, Mango Biche y Frutos Rojos COMPLETO; Jet Vainilla REDUCIDO a 1 caja.
//   $80.000  → Limón COMPLETO; Mango Biche EXCLUIDO; Frutos Rojos REDUCIDO; Jet EXCLUIDO.
//
// El estado vive en memoria mientras la pestaña siga abierta.

const DEMORA_MS = 400;
const TIEMPO_ENTREGA = 2;
const PERIODO_REVISION = 7;

const esperar = (valor) =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), DEMORA_MS));

const errorHttp = (status, mensaje) =>
  Object.assign(new Error(mensaje), { response: { status, data: { error: mensaje } } });

/** LocalDateTime de Java: sin zona horaria. */
const fechaLocal = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/* Candidatos ya ordenados por urgencia y margen; precioCaja y margenCaja en COP. */
const CANDIDATOS = [
  {
    productoId: '6b1f0c2e-1a01-4c7e-9a10-000000000001', productoNombre: 'Aloha Paleta Limón',
    urgencia: 'CRITICO', score: 91.4, demandaDiaria: 14.286, factorEstacionalidad: 1.15,
    stockSeguridad: 28.5, puntoReorden: 57.07, stockActual: 12, coberturaDias: 0.84,
    unidadesSugeridas: 72, cajas: 3, precioCaja: 20000, margenCaja: 7000,
    texto: 'Crítico: quedan 0,84 días de inventario y el proveedor tarda 2 días. Promedio de 14,29 unidades/día en 60 días. Las ventas del último mes van 1,15× por encima del promedio.',
  },
  {
    productoId: '6b1f0c2e-1a01-4c7e-9a10-000000000002', productoNombre: 'Aloha Mango Biche',
    urgencia: 'CRITICO', score: 84.2, demandaDiaria: 9.5, factorEstacionalidad: 1.0,
    stockSeguridad: 19.0, puntoReorden: 38.0, stockActual: 10, coberturaDias: 1.05,
    unidadesSugeridas: 48, cajas: 2, precioCaja: 25000, margenCaja: 8000,
    texto: 'Crítico: quedan 1,05 días de inventario y el proveedor tarda 2 días. Promedio de 9,5 unidades/día en 60 días.',
  },
  {
    productoId: '6b1f0c2e-1a01-4c7e-9a10-000000000003', productoNombre: 'Aloha Frutos Rojos Mix',
    urgencia: 'ALERTA', score: 63.8, demandaDiaria: 6.2, factorEstacionalidad: 1.08,
    stockSeguridad: 12.4, puntoReorden: 24.8, stockActual: 20, coberturaDias: 3.23,
    unidadesSugeridas: 40, cajas: 2, precioCaja: 18000, margenCaja: 6000,
    texto: 'Alerta: 20 unidades, por debajo del punto de reorden (24,8). Alcanza para 3,23 días. Las ventas del último mes van 1,08× por encima del promedio.',
  },
  {
    productoId: '6b1f0c2e-1a01-4c7e-9a10-000000000004', productoNombre: 'Jet Paleta Vainilla',
    urgencia: 'ESTABLE', score: 41.5, demandaDiaria: 8.0, factorEstacionalidad: 0.92,
    stockSeguridad: 16.0, puntoReorden: 32.0, stockActual: 40, coberturaDias: 5.0,
    unidadesSugeridas: 48, cajas: 4, precioCaja: 15000, margenCaja: 4500,
    texto: `Estable: cubre 5 días; se sugiere completar hasta el próximo pedido (${TIEMPO_ENTREGA}+${PERIODO_REVISION} días). Las ventas del último mes van 0,92× por debajo del promedio.`,
  },
];

const PRODUCTOS_EXCLUIDOS = [
  { productoId: '6b1f0c2e-1a01-4c7e-9a10-000000000005', nombre: 'Aloha Coco Cremoso', motivo: 'Sin precio de costo' },
  { productoId: '6b1f0c2e-1a01-4c7e-9a10-000000000006', nombre: 'Jet Cono Arequipe', motivo: 'Sin unidades por caja' },
];

const store = new Map();

/** Mismo cálculo que ItemRecomendacion.costoAprobado(). */
function costoAprobadoItem(item) {
  if (item.decision === 'APROBADO') return item.costoEstimado;
  if (item.decision === 'MODIFICADO' && item.cajasSugeridas > 0) {
    return Math.round((item.costoEstimado * item.cajasAprobadas * 100) / item.cajasSugeridas) / 100;
  }
  return 0;
}

const recalcular = (rec) => {
  rec.costoAprobado = rec.items.reduce((s, i) => s + costoAprobadoItem(i), 0);
};

function crearRecomendacion(presupuesto, createdAt = new Date()) {
  let disponible = presupuesto;
  const items = CANDIDATOS.map((c, idx) => {
    const completo = c.precioCaja * c.cajas;
    let cajas = c.cajas;
    let ajustePresupuesto = 'COMPLETO';
    if (completo > disponible) {
      cajas = Math.floor(disponible / c.precioCaja);
      ajustePresupuesto = cajas >= 1 ? 'REDUCIDO' : 'EXCLUIDO';
    }
    const costo = c.precioCaja * cajas;
    disponible -= costo;

    const sufijo = {
      COMPLETO: '',
      REDUCIDO: ` Reducido a ${cajas} ${cajas === 1 ? 'caja' : 'cajas'} por presupuesto.`,
      EXCLUIDO: ' Excede el presupuesto.',
    }[ajustePresupuesto];

    return {
      id: crypto.randomUUID(),
      productoId: c.productoId,
      productoNombre: c.productoNombre,
      prioridad: idx + 1,
      urgencia: c.urgencia,
      score: c.score,
      demandaDiaria: c.demandaDiaria,
      factorEstacionalidad: c.factorEstacionalidad,
      stockSeguridad: c.stockSeguridad,
      puntoReorden: c.puntoReorden,
      stockActual: c.stockActual,
      coberturaDias: c.coberturaDias,
      unidadesSugeridas: c.unidadesSugeridas,
      cajasSugeridas: cajas,
      ajustePresupuesto,
      costoEstimado: costo,
      margenEsperado: c.margenCaja * cajas,
      justificacion: c.texto + sufijo,
      decision: 'PENDIENTE',
      cajasAprobadas: null,
      motivoRechazo: null,
      fechaDecision: null,
    };
  });

  const rec = {
    id: crypto.randomUUID(),
    estado: 'GENERADA',
    origen: 'PANTALLA',
    presupuesto,
    costoTotal: items.reduce((s, i) => s + i.costoEstimado, 0),
    costoAprobado: 0,
    confianzaBaja: true,
    diasHistorial: 60,
    diasConVentas: 18,
    pedidoProveedorId: null,
    createdAt: fechaLocal(createdAt),
    updatedAt: fechaLocal(createdAt),
    items,
  };
  store.set(rec.id, rec);
  return rec;
}

/* Historial de ejemplo: recomendaciones de semanas anteriores. */
(function sembrarHistorial() {
  [5, 12, 19, 26, 40].forEach((dias, idx) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    const rec = crearRecomendacion(170000 - idx * 20000, fecha);
    rec.items.forEach((item, i) => {
      if (item.ajustePresupuesto === 'EXCLUIDO' || i === 3) {
        item.decision = 'RECHAZADO';
        item.cajasAprobadas = 0;
        item.motivoRechazo = 'Stock suficiente en bodega';
      } else if (i === 1 && item.cajasSugeridas > 1) {
        item.decision = 'MODIFICADO';
        item.cajasAprobadas = item.cajasSugeridas - 1;
      } else {
        item.decision = 'APROBADO';
        item.cajasAprobadas = item.cajasSugeridas;
      }
      item.fechaDecision = rec.createdAt;
    });
    recalcular(rec);
    if (idx === 2) {
      rec.estado = 'EN_REVISION';
    } else {
      rec.estado = 'PEDIDO_GENERADO';
      rec.pedidoProveedorId = crypto.randomUUID();
    }
  });
})();

/* ── Funciones simuladas (misma firma que recomendacionService) ── */

export function generar(presupuesto) {
  const valor = Number(presupuesto);
  if (!Number.isFinite(valor) || valor <= 0) {
    return Promise.reject(errorHttp(400, 'El presupuesto debe ser mayor a cero'));
  }
  const rec = crearRecomendacion(valor);
  // productosExcluidos solo viaja en la respuesta, igual que en el backend: no se guarda.
  return esperar({ ...rec, productosExcluidos: PRODUCTOS_EXCLUIDOS });
}

export function obtener(id) {
  const rec = store.get(id);
  if (!rec) return Promise.reject(errorHttp(404, 'Recomendación no encontrada'));
  return esperar(rec);
}

export function decidir(id, itemId, { decision, cajas, motivo }) {
  const rec = store.get(id);
  if (!rec) return Promise.reject(errorHttp(404, 'Recomendación no encontrada'));
  const item = rec.items.find((i) => i.id === itemId);
  if (!item) return Promise.reject(errorHttp(404, 'Ítem no encontrado'));
  if (rec.estado === 'PEDIDO_GENERADO') {
    return Promise.reject(errorHttp(409, 'La recomendación ya se convirtió en pedido'));
  }

  const rechazar = (m) => Object.assign(item, { decision: 'RECHAZADO', cajasAprobadas: 0, motivoRechazo: m });
  if (decision === 'APROBADO') {
    if (item.ajustePresupuesto === 'EXCLUIDO' || !(item.cajasSugeridas > 0)) {
      return Promise.reject(errorHttp(400, 'Indica las cajas'));
    }
    Object.assign(item, { decision, cajasAprobadas: item.cajasSugeridas, motivoRechazo: null });
  } else if (decision === 'MODIFICADO') {
    if (cajas == null) return Promise.reject(errorHttp(400, 'Indica las cajas'));
    if (cajas < 0) return Promise.reject(errorHttp(400, 'Las cajas no pueden ser negativas'));
    if (cajas === 0) rechazar('Modificado a 0 cajas');
    else Object.assign(item, { decision, cajasAprobadas: cajas, motivoRechazo: null });
  } else if (decision === 'RECHAZADO') {
    rechazar(motivo ?? null);
  } else {
    return Promise.reject(errorHttp(400, 'Decisión no válida'));
  }
  item.fechaDecision = fechaLocal();
  recalcular(rec);
  rec.estado = 'EN_REVISION';
  rec.updatedAt = fechaLocal();
  return esperar(item);
}

export function pedido(id) {
  const rec = store.get(id);
  if (!rec) return Promise.reject(errorHttp(404, 'Recomendación no encontrada'));
  if (rec.estado === 'PEDIDO_GENERADO') {
    return Promise.reject(errorHttp(409, 'La recomendación ya se convirtió en pedido'));
  }
  const aprobados = rec.items.filter((i) =>
    (i.decision === 'APROBADO' || i.decision === 'MODIFICADO') && i.cajasAprobadas > 0);
  if (aprobados.length === 0) return Promise.reject(errorHttp(400, 'Aprueba al menos un producto'));

  rec.estado = 'PEDIDO_GENERADO';
  rec.pedidoProveedorId = crypto.randomUUID();
  // En modo simulado no hay archivo: la descarga del Excel fallará con 404 si se intenta.
  return esperar({ pedidoId: rec.pedidoProveedorId, exportUrl: null });
}

const enRango = (rec, desde, hasta) => {
  const fecha = rec.createdAt.slice(0, 10);
  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
};

const contar = (items, decision) => items.filter((i) => i.decision === decision).length;

export function historial({ desde, hasta, estado, page = 0, size = 20 } = {}) {
  const lista = [...store.values()]
    .filter((r) => enRango(r, desde, hasta) && (!estado || r.estado === estado))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      estado: r.estado,
      origen: r.origen,
      presupuesto: r.presupuesto,
      costoTotal: r.costoTotal,
      costoAprobado: r.costoAprobado,
      confianzaBaja: r.confianzaBaja,
      pedidoProveedorId: r.pedidoProveedorId,
      totalItems: r.items.length,
      aprobados: contar(r.items, 'APROBADO'),
      modificados: contar(r.items, 'MODIFICADO'),
      rechazados: contar(r.items, 'RECHAZADO'),
      pendientes: contar(r.items, 'PENDIENTE'),
    }));
  return esperar({
    content: lista.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: lista.length,
    totalPages: Math.ceil(lista.length / size),
  });
}

export function metricas(desde, hasta) {
  const recs = [...store.values()].filter((r) => enRango(r, desde, hasta));
  const items = recs.flatMap((r) => r.items);
  const aprobados = contar(items, 'APROBADO');
  const modificados = contar(items, 'MODIFICADO');
  const redondear = (v) => Math.round(v * 10000) / 10000;

  const precisiones = recs
    .filter((r) => r.pedidoProveedorId)
    .flatMap((r) => r.items)
    .filter((i) => (i.decision === 'APROBADO' || i.decision === 'MODIFICADO')
      && i.ajustePresupuesto !== 'EXCLUIDO' && i.cajasSugeridas > 0)
    .map((i) => Math.max(0, 1 - Math.abs(i.cajasAprobadas - i.cajasSugeridas) / i.cajasSugeridas));

  return esperar({
    generadas: recs.length,
    itemsSugeridos: items.length,
    aprobados,
    modificados,
    rechazados: contar(items, 'RECHAZADO'),
    tasaAprobacion: items.length === 0 ? 0 : redondear((aprobados + modificados) / items.length),
    precisionCantidad: precisiones.length === 0
      ? null
      : redondear(precisiones.reduce((s, p) => s + p, 0) / precisiones.length),
  });
}
