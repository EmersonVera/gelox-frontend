import api from '../api/axiosConfig';
import { interpretar as interpretarVozMock, confirmar as confirmarVozMock } from './vozMock';

// Mientras el backend de voz no esté listo, las funciones responden con datos
// simulados (ver vozMock.js). Pasar al backend real es poner
// VITE_USAR_MOCK_VOZ=false en el .env, sin tocar código.
const USAR_MOCK_VOZ = import.meta.env.VITE_USAR_MOCK_VOZ !== 'false';

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
