import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult, signOut } from 'firebase/auth';
import { auth } from '../auth/firebase';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const result = await getIdTokenResult(user);
        setUsuario(user);
        setToken(result.token);
        try {
          const { data } = await api.post('/api/auth/verificar', {});
          setPerfil(data);
        } catch {
          setPerfil(null);
        }
      } else {
        setUsuario(null);
        setPerfil(null);
        setToken(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  const updatePerfil = (updates) => {
    setPerfil((prev) => ({ ...prev, ...updates }));
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ usuario, perfil, updatePerfil, token, cargando, rol: perfil?.rol ?? null, logout }}>
      {!cargando && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
