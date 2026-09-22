// Mock de voz para RF41 (REGISTRAR_VENTA). Sigue el contrato real de
// vozMock.js: cada mock exporta coincide(texto), interpretar(texto, confianza)
// y confirmar(comandoId, confirmar) — no hay que tocar vozMock.js, se detecta
// solo vía import.meta.glob.
//
// También reconoce "agrega…" para el agregado secuencial de un ítem al
// pedido ya interpretado (T41-BE5 / T42-FE2): cada interpretar() sobre una
// frase de "agrega" suma una caja más de Festival al pedido en curso, en
// vez de reiniciarlo — así se puede probar ese reenvío desde el hook.

const PRECIO_CAJA_FESTIVAL = 42000;
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

// Pedido en curso: se guarda entre interpretar() y confirmar() (y entre
// interpretar() sucesivos por "agrega…"), igual que lo haría el backend
// real mientras la confirmación sigue pendiente.
let pedidoActual = null;
let contador = 0;

function construirItems(cajasFestival) {
  return [
    {
      productoId: 'prod-festival',
      nombre: 'Festival',
      cantidadCajas: cajasFestival,
      cantidadUnidades: 0,
      subtotal: cajasFestival * PRECIO_CAJA_FESTIVAL,
    },
  ];
}

function calcularTotal(items, costoEnvio) {
  return items.reduce((s, i) => s + i.subtotal, 0) + (costoEnvio || 0);
}

function datosDesdePedido(pedido) {
  const items = construirItems(pedido.cajasFestival);
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
    pedidoActual = { ...pedidoActual, cajasFestival: pedidoActual.cajasFestival + 1 };
  } else {
    const esRural = t.includes('rural') || t.includes('a juan');
    pedidoActual = {
      canal: esRural ? 'RURAL' : 'VENTANILLA',
      cajasFestival: 3,
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
      ? `Agregué una caja más de Festival. Ahora son ${pedidoActual.cajasFestival} cajas por un total de ${totalTexto}. ¿Confirmas?`
      : `Vas a registrar ${pedidoActual.cajasFestival} cajas de Festival por un total de ${totalTexto}. ¿Confirmas?`,
    datos,
  };
}

export function confirmar(comandoId, confirmarValor) {
  if (!confirmarValor || !pedidoActual) {
    pedidoActual = null;
    return {
      comandoId,
      intencion: 'REGISTRAR_VENTA',
      requiereConfirmacion: false,
      expiraEnSegundos: null,
      textoRespuesta: 'Venta cancelada.',
      datos: null,
    };
  }

  const datos = { ...datosDesdePedido(pedidoActual), ventaId: `V-${Date.now()}` };
  pedidoActual = null;

  return {
    comandoId,
    intencion: 'REGISTRAR_VENTA',
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: `Venta registrada por ${formatoCOPSimple(datos.total)}.`,
    datos,
  };
}
