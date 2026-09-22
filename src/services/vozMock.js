// Carga automática de todos los mocks en ./mocks/*.js. Cada archivo
// mocks/mockXxx.js exporta { coincide(texto), interpretar(texto, confianza),
// confirmar(comandoId, confirmar) } y queda registrado solo con crear el
// archivo — no hay que tocar este archivo para que participe.
const modulos = import.meta.glob('./mocks/*.js', { eager: true });

const RUTA_DESCONOCIDO = './mocks/mockDesconocido.js';
const mockDesconocido = modulos[RUTA_DESCONOCIDO];

const mocksConocidos = Object.entries(modulos)
  .filter(([ruta]) => ruta !== RUTA_DESCONOCIDO)
  .map(([, modulo]) => modulo);

// Recuerda qué mock generó cada comandoId para poder enrutar la confirmación
// al mismo mock que lo interpretó.
const mockPorComandoId = new Map();

function encontrarMockParaTexto(texto) {
  return mocksConocidos.find((mock) => mock.coincide(texto)) ?? mockDesconocido;
}

export async function interpretar(texto, confianza) {
  const mock = encontrarMockParaTexto(texto);
  const respuesta = await mock.interpretar(texto, confianza);
  if (respuesta?.comandoId) {
    mockPorComandoId.set(respuesta.comandoId, mock);
  }
  return respuesta;
}

export async function confirmar(comandoId, confirmar) {
  const mock = mockPorComandoId.get(comandoId) ?? mockDesconocido;
  return mock.confirmar(comandoId, confirmar);
}
