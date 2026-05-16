import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../auth/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const result = await getIdTokenResult(user);
        setUsuario(user);
        setRol(result.claims.rol ?? null);
        setToken(result.token);
      } else {
        setUsuario(null);
        setRol(null);
        setToken(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, rol, token, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
