import axios from 'axios';
import { auth } from '../auth/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Resolves once Firebase has determined the initial auth state (user or null).
// After that, auth.currentUser is guaranteed to reflect the real session.
const authReady = new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, () => {
    unsub();
    resolve();
  });
});

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  await authReady;
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Cuando el body es FormData, dejar que el navegador genere el Content-Type
  // con el boundary correcto. Poner Content-Type manual rompe el upload.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// RF59 — Distribuidora suspendida o inactiva: el backend responde 403 con
// codigo DISTRIBUIDORA_SUSPENDIDA | DISTRIBUIDORA_INACTIVA. Se guarda lo que muestra
// la pantalla informativa y se redirige a ella. Los demás 403 (incluido
// USUARIO_INACTIVO) siguen su flujo normal.
export const BLOQUEO_STORAGE_KEY = 'gelox_bloqueo_distribuidora';
const RUTA_BLOQUEO = '/distribuidora-bloqueada';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status === 403 && typeof data?.codigo === 'string' && data.codigo.startsWith('DISTRIBUIDORA_')) {
      try {
        sessionStorage.setItem(BLOQUEO_STORAGE_KEY, JSON.stringify({
          codigo: data.codigo,
          distribuidora: data.distribuidora ?? null,
          contacto: data.contacto ?? null,
        }));
      } catch { /* sessionStorage no disponible */ }
      // Ya en la pantalla (p. ej. AuthContext pidiendo el perfil al recargar): no volver a redirigir.
      if (window.location.pathname !== RUTA_BLOQUEO) window.location.replace(RUTA_BLOQUEO);
    }
    return Promise.reject(error);
  },
);

// Solo desarrollo con mock: geloxSimularBloqueo('DISTRIBUIDORA_SUSPENDIDA') en la consola
// fuerza un 403 que pasa por el interceptor de arriba (ver mocks/mockPlataforma.js).
if (import.meta.env.DEV && import.meta.env.VITE_USAR_MOCK_IT2 !== 'false') {
  import('../services/mocks/mockPlataforma').then(({ instalarSimuladorBloqueo }) => instalarSimuladorBloqueo(api));
}

export default api;
