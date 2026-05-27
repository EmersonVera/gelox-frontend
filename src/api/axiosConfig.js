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

export default api;
