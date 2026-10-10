import api from '../api/axiosConfig';
import { interpretar as interpretarVozMock, confirmar as confirmarVozMock } from './vozMock';

// Por defecto se usa el backend real. Los datos simulados (ver vozMock.js),
// que solo entienden frases fijas, se activan con VITE_USAR_MOCK_VOZ=true en el .env.
const USAR_MOCK_VOZ = import.meta.env.VITE_USAR_MOCK_VOZ === 'true';

export async function interpretarComando(texto, confianza) {
  if (USAR_MOCK_VOZ) {
    return interpretarVozMock(texto, confianza);
  }
  const { data } = await api.post('/api/voz/interpretar', { texto, confianza });
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
 * Descarga el Excel de un pedido a proveedor generado por voz (RF52/RF53).
 * GET /api/inventario/pedidos/{id}/exportar (T47-BE4). Mismo patrón de blob
 * que pages/inventarios/GenerarPedido.jsx (líneas ~125-126), sin tocar ese archivo.
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
}
