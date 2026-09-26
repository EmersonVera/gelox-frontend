

const PRECIO_CAJA_ALOHA = 84000; // 3.500 (precioVenta real) x 24 (unidadesPorCaja real)
const COSTO_ENVIO_RURAL = 8000;

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function formatoCOPSimple(n) {
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

export function coincide(texto) {
  const t = normalizar(texto);
  return /registra|vende|agrega/.test(t);
}


let pedidoActual = null;
let contador = 0;

function construirItems(cajasAloha) {

  return [
    {
      productoId: 'prod-aloha-mango-biche',
      nombre: 'Aloha Mango Biche',
      cajas: cajasAloha,
      unidades: 0,
      subtotal: cajasAloha * PRECIO_CAJA_ALOHA,
    },
  ];
}

function calcularTotal(items, costoEnvio) {
  return items.reduce((s, i) => s + i.subtotal, 0) + (costoEnvio || 0);
}

function datosDesdePedido(pedido) {
  const items = construirItems(pedido.cajasAloha);
  return {
    canal: pedido.canal,
    items,
    destinatario: pedido.destinatario,
    costoEnvio: pedido.costoEnvio,
    metodoPago: pedido.metodoPago,
    total: calcularTotal(items, pedido.costoEnvio),
  };
}

export function interpretar(texto) {
  contador += 1;
  const t = normalizar(texto);
  const esAgregar = t.includes('agrega') && !!pedidoActual;

  if (esAgregar) {
    pedidoActual = { ...pedidoActual, cajasAloha: pedidoActual.cajasAloha + 1 };
  } else {
    const esRural = t.includes('rural') || t.includes('a juan');
    pedidoActual = {
      canal: esRural ? 'RURAL' : 'VENTANILLA',
      cajasAloha: 3,
      destinatario: esRural ? 'Juan Pérez' : null,
      costoEnvio: esRural ? COSTO_ENVIO_RURAL : 0,
      metodoPago: 'EFECTIVO',
    };
  }

  const datos = datosDesdePedido(pedidoActual);
  const totalTexto = formatoCOPSimple(datos.total);

  return {
    comandoId: `mock-registrar-venta-${contador}`,
    intencion: 'REGISTRAR_VENTA',
    requiereConfirmacion: true,
    expiraEnSegundos: null, // sin límite de tiempo: se confirma/cancela por voz o botón
    textoRespuesta: esAgregar
      ? `Agregué una caja más de Aloha Mango Biche. Ahora son ${pedidoActual.cajasAloha} cajas por un total de ${totalTexto}. ¿Confirmas?`
      : `Vas a registrar ${pedidoActual.cajasAloha} cajas de Aloha Mango Biche por un total de ${totalTexto}. ¿Confirmas?`,
    datos,
  };
}

// INT1-FE1 — VozConfirmarResponse real es {estado, textoRespuesta, datos},
// sin comandoId/intencion/requiereConfirmacion, y en confirmación exitosa
// `datos` viene parcial (ventaId + total, no items/canal/metodoPago: eso ya
// se mostró en interpretar y el hook lo fusiona). El mock imita ese
// contrato real, no el viejo (con comandoId/intencion) que asumía antes.
export function confirmar(comandoId, confirmarValor) {
  if (!confirmarValor || !pedidoActual) {
    pedidoActual = null;
    return { estado: 'CANCELADO', textoRespuesta: 'Venta cancelada.', datos: {} };
  }

  const { total } = datosDesdePedido(pedidoActual);
  pedidoActual = null;

  return {
    estado: 'PROCESADO',
    textoRespuesta: `Venta registrada por ${formatoCOPSimple(total)}.`,
    datos: { ventaId: `V-${Date.now()}`, total },
  };
}
