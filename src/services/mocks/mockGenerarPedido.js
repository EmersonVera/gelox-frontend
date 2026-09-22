// Mock de voz para RF52 (GENERAR_PEDIDO).
// Simula "Genera un pedido con 20 cajas de Solo Lack y 15 de Festival" con la
// forma exacta del contrato (FP-15 §2.2/2.4-2.6). `respuesta` es el estado
// antes de confirmar (solo items); `respuestaConfirmada` es lo que devuelve
// POST /api/voz/confirmar una vez el backend crea el pedido (T47).

export default {
  frase: "Genera un pedido con 20 cajas de Solo Lack y 15 de Festival",
  respuesta: {
    comandoId: "mock-generar-pedido-001",
    intencion: "GENERAR_PEDIDO",
    requiereConfirmacion: true,
    expiraEnSegundos: 15,
    textoRespuesta:
      "Armé un borrador con 20 cajas de Solo Lack y 15 cajas de Festival. ¿Confirmas el pedido?",
    datos: {
      items: [
        { productoId: "prod-solo-lack", nombre: "Solo Lack", cantidadCajas: 20, cantidadUnidades: 0 },
        { productoId: "prod-festival", nombre: "Festival", cantidadCajas: 15, cantidadUnidades: 0 },
      ],
    },
  },
  respuestaConfirmada: {
    comandoId: "mock-generar-pedido-001",
    intencion: "GENERAR_PEDIDO",
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: "Pedido registrado correctamente.",
    datos: {
      items: [
        { productoId: "prod-solo-lack", nombre: "Solo Lack", cantidadCajas: 20, cantidadUnidades: 0 },
        { productoId: "prod-festival", nombre: "Festival", cantidadCajas: 15, cantidadUnidades: 0 },
      ],
      pedidoId: "3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b",
      exportUrl: "/api/inventario/pedidos/3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b/exportar",
    },
  },
};
