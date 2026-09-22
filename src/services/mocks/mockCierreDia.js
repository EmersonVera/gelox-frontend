// Mock de voz para RF51 (CONSULTAR_FINANZAS, tipo "cierre").
// Simula la frase "GELOX, cerrar día y balance de hoy" con la forma exacta
// de datos que entrega el backend (FP-15 §2.2/2.4-2.6), para probar
// VistaCierreDia sin depender de INT5 (integración real).
//
// Sigue el contrato real de vozMock.js: coincide(texto), interpretar(texto,
// confianza), confirmar(comandoId, confirmar) — no hay que tocar vozMock.js,
// se detecta solo vía import.meta.glob.

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function coincide(texto) {
  const t = normalizar(texto);
  return t.includes('cerrar dia') || t.includes('cierre') || (t.includes('balance') && t.includes('hoy'));
}

let contador = 0;

export function interpretar() {
  contador += 1;
  return {
    comandoId: `mock-cierre-dia-${contador}`,
    intencion: 'CONSULTAR_FINANZAS',
    requiereConfirmacion: false,
    expiraEnSegundos: 30,
    textoRespuesta:
      'El cierre de hoy suma $3.050.000 en 147 transacciones, sin diferencias en caja.',
    datos: {
      tipo: 'cierre',
      periodo: 'Hoy · 21 de septiembre de 2026',
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
  };
}

export function confirmar(comandoId) {
  // CONSULTAR_FINANZAS no pide confirmación; se implementa por consistencia
  // con el contrato de vozMock.js.
  return {
    comandoId,
    intencion: 'CONSULTAR_FINANZAS',
    requiereConfirmacion: false,
    expiraEnSegundos: 0,
    textoRespuesta: 'Esta consulta no requiere confirmación.',
    datos: null,
  };
}
