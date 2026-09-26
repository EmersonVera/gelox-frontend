// Mock de voz para RF53 (MODIFICAR_PEDIDO). Sigue el contrato real de
// vozMock.js: cada mock exporta coincide(texto), interpretar(texto, confianza)
// y confirmar(comandoId, confirmar) — no hay que tocar vozMock.js, se detecta
// solo vía import.meta.glob.
//
// Flujo alterno de RF53 (ok:false, sin pedido pendiente): decir cualquier
// frase de modificación que NO mencione "aloha" (el único producto del
// pedido pendiente simulado) — ej. "modifica el pedido pendiente y agrega
// 5 de chococono" — porque no hay un backend real que sepa qué hay pendiente.

const PEDIDO_ID = '3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b';

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function coincide(texto) {
  const t = normalizar(texto);
  return t.includes('pedido pendiente') || t.includes('modificar pedido') || t.includes('modifica el pedido');
}

let contador = 0;

export function interpretar(texto) {
  contador += 1;
  const comandoId = `mock-modificar-pedido-${contador}`;

  if (!normalizar(texto).includes('aloha')) {
    return {
      comandoId,
      intencion: 'MODIFICAR_PEDIDO',
      ok: false,
      requiereConfirmacion: false,
      expiraEnSegundos: null,
      textoRespuesta: 'No encontré un pedido pendiente para modificar.',
      datos: null,
    };
  }

  return {
    comandoId,
    intencion: 'MODIFICAR_PEDIDO',
    requiereConfirmacion: true,
    expiraEnSegundos: 15,
    textoRespuesta:
      'Voy a agregar 10 unidades de Aloha Mango Biche al pedido pendiente, quedando en 25. ¿Confirmas?',
    datos: {
      pedidoId: PEDIDO_ID,
      accion: 'AGREGAR',
      producto: 'Aloha Mango Biche',
      cantidadAnterior: 15,
      cantidadNueva: 25,
    },
  };
}

export function confirmar(comandoId, confirmarValor) {
  if (!confirmarValor) {
    return {
      comandoId,
      intencion: 'MODIFICAR_PEDIDO',
      requiereConfirmacion: false,
      expiraEnSegundos: null,
      textoRespuesta: 'Modificación cancelada.',
      datos: null,
    };
  }
  return {
    comandoId,
    intencion: 'MODIFICAR_PEDIDO',
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: 'Pedido actualizado correctamente.',
    datos: {
      pedidoId: PEDIDO_ID,
      accion: 'AGREGAR',
      producto: 'Aloha Mango Biche',
      cantidadAnterior: 15,
      cantidadNueva: 25,
      exportUrl: `/api/inventario/pedidos/${PEDIDO_ID}/exportar`,
    },
  };
}
