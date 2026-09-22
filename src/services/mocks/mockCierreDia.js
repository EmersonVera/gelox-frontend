// Mock de voz para RF51 (CONSULTAR_FINANZAS, tipo "cierre").
// Simula la frase "GELOX, cerrar día y balance de hoy" con la forma exacta
// de datos que entrega el backend (FP-15 §2.2/2.4-2.6), para probar
// VistaCierreDia sin depender de INT5 (integración real). No se toca
// vozMock.js: se detecta solo vía import.meta.glob cuando ese archivo
// exista en la rama.

export default {
  frase: "GELOX, cerrar día y balance de hoy",
  respuesta: {
    comandoId: "mock-cierre-dia-001",
    intencion: "CONSULTAR_FINANZAS",
    requiereConfirmacion: false,
    expiraEnSegundos: 30,
    textoRespuesta:
      "El cierre de hoy suma $3.050.000 en 147 transacciones, sin diferencias en caja.",
    datos: {
      tipo: "cierre",
      periodo: "Hoy · 21 de septiembre de 2026",
      ingresosVentanilla: 1420000,
      ingresosRural: 980000,
      ingresosComerciantes: 650000,
      totalIngresos: 3050000,
      totalTransacciones: 147,
      variacionVentanilla: 8,
      variacionRural: -3,
      variacionComerciantes: 5,
      conciliacion: {
        montoCalculadoTotal: 3050000,
        montoFisicoTotal: 3050000,
        diferenciaTotal: 0,
        tieneDiferencias: false,
      },
    },
  },
};
