// Mock de voz para CONSULTAR_INVENTARIO (T44). Sigue el contrato real de
// vozMock.js: coincide(texto), interpretar(texto, confianza), confirmar(
// comandoId, confirmar) — no hay que tocar vozMock.js, se detecta solo vía
// import.meta.glob.
//
// Es de solo lectura (no ejecuta ninguna acción); la única confirmación
// posible es de interpretación: si confianza < 70%, en vez de productos
// devuelve un "¿Quisiste decir...?" (requiereConfirmacion:true) y solo al
// confirmar entrega la consulta real — mismo mecanismo de confirmar() del
// hook que usa REGISTRAR_VENTA, aplicado acá a una duda de reconocimiento
// en vez de a una acción de negocio.

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function coincide(texto) {
  const t = normalizar(texto);
  return t.includes('inventario') || t.includes('stock') || t.includes('cuanto hay') || t.includes('cuantas cajas');
}

const PRODUCTOS = [
  { productoId: 'prod-festival', nombre: 'Festival', cajas: 15, unidadesSueltas: 4, estado: 'NORMAL' },
  { productoId: 'prod-solo-lack', nombre: 'Solo Lack', cajas: 1, unidadesSueltas: 2, estado: 'BAJO_STOCK' },
];

const ALERTAS = [
  { productoId: 'prod-solo-lack', nombre: 'Solo Lack', stockActual: 12, stockMinimo: 30, estado: 'BAJO_STOCK' },
];

let contador = 0;

function respuestaConsulta(comandoId) {
  return {
    comandoId,
    intencion: 'CONSULTAR_INVENTARIO',
    requiereConfirmacion: false,
    expiraEnSegundos: null,
    textoRespuesta: 'Festival tiene stock normal. Solo Lack está bajo el mínimo.',
    datos: { productos: PRODUCTOS, alertas: ALERTAS },
  };
}

export function interpretar(texto, confianza) {
  contador += 1;
  const comandoId = `mock-consultar-inventario-${contador}`;

  if ((confianza ?? 1) < 0.7) {
    return {
      comandoId,
      intencion: 'CONSULTAR_INVENTARIO',
      requiereConfirmacion: true,
      expiraEnSegundos: null,
      textoRespuesta: '¿Quisiste decir "inventario de Festival"? Di confirmar o cancelar.',
      datos: { sugerencia: 'Festival' },
    };
  }

  return respuestaConsulta(comandoId);
}

export function confirmar(comandoId, confirmarValor) {
  if (!confirmarValor) {
    return {
      comandoId,
      intencion: 'CONSULTAR_INVENTARIO',
      requiereConfirmacion: false,
      expiraEnSegundos: null,
      textoRespuesta: 'Consulta cancelada.',
      datos: null,
    };
  }
  return respuestaConsulta(comandoId);
}
