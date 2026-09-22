// Mock de voz para RF53 (MODIFICAR_PEDIDO).
// Simula "Al pedido pendiente agrégale 10 de Festival" con la forma exacta
// del contrato (FP-15 §2.2/2.4-2.6). `respuesta` es el estado antes de
// confirmar; `respuestaConfirmada` es lo que devuelve POST /api/voz/confirmar
// una vez el backend aplica el cambio (T47). `respuestaSinPedidoPendiente` es
// el flujo alterno: `ok:false`, sin pedido pendiente o producto no encontrado.

export default {
  frase: "Al pedido pendiente agrégale 10 de Festival",
  respuesta: {
    comandoId: "mock-modificar-pedido-001",
    intencion: "MODIFICAR_PEDIDO",
    requiereConfirmacion: true,
    expiraEnSegundos: 15,
    textoRespuesta:
      "Voy a agregar 10 unidades de Festival al pedido pendiente, quedando en 25. ¿Confirmas?",
    datos: {
      pedidoId: "3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b",
      accion: "AGREGAR",
      producto: "Festival",
      cantidadAnterior: 15,
      cantidadNueva: 25,
    },
  },
  respuestaConfirmada: {
    comandoId: "mock-modificar-pedido-001",
    intencion: "MODIFICAR_PEDIDO",
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: "Pedido actualizado correctamente.",
    datos: {
      pedidoId: "3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b",
      accion: "AGREGAR",
      producto: "Festival",
      cantidadAnterior: 15,
      cantidadNueva: 25,
      exportUrl: "/api/inventario/pedidos/3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b/exportar",
    },
  },
  respuestaSinPedidoPendiente: {
    ok: false,
    comandoId: "mock-modificar-pedido-002",
    intencion: "MODIFICAR_PEDIDO",
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: "No encontré un pedido pendiente para modificar.",
    datos: null,
  },
};
