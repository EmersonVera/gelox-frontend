import api from '../api/axiosConfig';
import { avisosDePedido } from './avisosPedido';
import { interpretar as interpretarVozMock, confirmar as confirmarVozMock } from './vozMock';

// Por defecto se usa el backend real. Los datos simulados (ver vozMock.js),
// que solo entienden frases fijas, se activan con VITE_USAR_MOCK_VOZ=true en el .env.
const USAR_MOCK_VOZ = import.meta.env.VITE_USAR_MOCK_VOZ === 'true';

/**
 * continuacion: true si la frase responde la pregunta que el asistente acaba de hacer (el micrófono
 * se abrió solo), false si es un comando nuevo (el usuario abrió el micrófono). Sin valor, decide el backend.
 */
export async function interpretarComando(texto, confianza, continuacion) {
  if (USAR_MOCK_VOZ) {
    return interpretarVozMock(texto, confianza);
  }
  const body = { texto, confianza };
  if (typeof continuacion === 'boolean') body.continuacion = continuacion;
  const { data } = await api.post('/api/voz/interpretar', body);
  return data;
}

export async function confirmarComando(comandoId, confirmar) {
  if (USAR_MOCK_VOZ) {
    return confirmarVozMock(comandoId, confirmar);
  }
  const { data } = await api.post('/api/voz/confirmar', { comandoId, confirmar });
  return data;
}

function nombreDesdeContentDisposition(headerValue, fallback) {
  if (!headerValue) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(headerValue);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Descarga el Excel de un pedido a proveedor con la plantilla de su proveedor (RF52/RF53, RF67).
 * GET /api/inventario/pedidos/{id}/exportar (T47-BE4). Devuelve { nombre, avisos }
 * (productos sin código o sin fila en el archivo, ver avisosPedido.js).
 */
export async function descargarExportacionPedido(exportUrl) {
  const respuesta = await api.get(exportUrl, { responseType: 'blob' });
  const nombre = nombreDesdeContentDisposition(
    respuesta.headers['content-disposition'],
    'pedido.xlsx'
  );
  const url = URL.createObjectURL(respuesta.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
  return { nombre, avisos: avisosDePedido((encabezado) => respuesta.headers[encabezado]) };
}
