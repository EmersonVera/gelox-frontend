// Mock de voz para RF50 (CONSULTAR_FINANZAS, tipo "ganancia").
// Simula la frase "¿Cuánto ganamos en ventanilla hoy?" con la forma exacta
// de datos que entrega el backend (FP-15 §2.2/2.4), para probar VistaFinanzas
// sin depender de INT5 (integración real). No se toca vozMock.js: se detecta
// solo vía import.meta.glob cuando ese archivo exista en la rama.

export default {
  frase: "¿Cuánto ganamos en ventanilla hoy?",
  respuesta: {
    comandoId: "mock-finanzas-ganancia-001",
    intencion: "CONSULTAR_FINANZAS",
    requiereConfirmacion: false,
    expiraEnSegundos: 30,
    textoRespuesta:
      "Hoy la utilidad neta fue de $612.000 con un margen de ganancia del 20 %.",
    datos: {
      tipo: "ganancia",
      periodo: "Hoy · 21 de septiembre de 2026",
      ingresosVentanilla: 1420000,
      ingresosRural: 980000,
      ingresosComerciantes: 650000,
      ingresosTotales: 3050000,
      utilidadNeta: 612000,
      margenGanancia: 20,
      canales: [
        { canal: "Ventanilla", totalIngresos: 1420000, totalCostos: 1050000, margen: 26 },
        { canal: "Rural", totalIngresos: 980000, totalCostos: 780000, margen: 20 },
        { canal: "Comerciantes", totalIngresos: 650000, totalCostos: 608000, margen: 6.5 },
      ],
    },
  },
};
