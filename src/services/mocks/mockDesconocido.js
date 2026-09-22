// Mock de respaldo: se usa cuando ningún otro mock de mocks/*.js reconoce
// el texto dictado. Responde con intencion: null y un ejemplo de cómo hablar.
let contador = 0;

export function coincide() {
  // Siempre "reconoce" el texto, pero vozMock.js lo excluye de la búsqueda
  // normal y solo lo usa como último recurso.
  return true;
}

export function interpretar(texto) {
  contador += 1;
  return {
    comandoId: `desconocido-${Date.now()}-${contador}`,
    intencion: null,
    requiereConfirmacion: false,
    expiraEnSegundos: 0,
    textoRespuesta: `No entendí "${texto}". Probá decir algo como "vender 2 kilos de hielo a Juan Pérez".`,
    datos: null,
  };
}

export function confirmar(comandoId) {
  return {
    comandoId,
    intencion: null,
    requiereConfirmacion: false,
    expiraEnSegundos: 0,
    textoRespuesta: 'Ese comando ya expiró o no existe. Volvé a intentarlo.',
    datos: null,
  };
}
