// Mock de voz para RF52 (GENERAR_PEDIDO). Sigue el contrato real de
// vozMock.js: cada mock exporta coincide(texto), interpretar(texto, confianza)
// y confirmar(comandoId, confirmar) — no hay que tocar vozMock.js, se detecta
// solo vía import.meta.glob.

const ITEMS = [
  { productoId: 'prod-aloha-paleta-limon', nombre: 'Aloha Paleta Limon', cantidadCajas: 20, cantidadUnidades: 0 },
  { productoId: 'prod-aloha-mango-biche', nombre: 'Aloha Mango Biche', cantidadCajas: 15, cantidadUnidades: 0 },
];
const PEDIDO_ID = '3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b';

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function coincide(texto) {
  const t = normalizar(texto);
  // Exige el verbo de creación: si no, "aloha" haría que esto le gane a
  // mockModificarPedido cuando la frase es de modificación, no de creación.
  const esCreacion = t.includes('genera') || t.includes('crea el pedido') || t.includes('crear pedido') || t.includes('hacer pedido');
  return esCreacion && t.includes('pedido');
}

let contador = 0;

export function interpretar() {
  contador += 1;
  return {
    comandoId: `mock-generar-pedido-${contador}`,
    intencion: 'GENERAR_PEDIDO',
    requiereConfirmacion: true,
    expiraEnSegundos: 15,
    textoRespuesta:
      'Armé un borrador con 20 cajas de Aloha Paleta Limon y 15 cajas de Aloha Mango Biche. ¿Confirmas el pedido?',
    datos: { items: ITEMS },
  };
}

export function confirmar(comandoId, confirmarValor) {
  if (!confirmarValor) {
    return {
      comandoId,
      intencion: 'GENERAR_PEDIDO',
      requiereConfirmacion: false,
      expiraEnSegundos: null,
      textoRespuesta: 'Pedido cancelado.',
      datos: null,
    };
  }
  return {
    comandoId,
    intencion: 'GENERAR_PEDIDO',
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: 'Pedido registrado correctamente.',
    datos: {
      items: ITEMS,
      pedidoId: PEDIDO_ID,
      exportUrl: `/api/inventario/pedidos/${PEDIDO_ID}/exportar`,
    },
  };
}
