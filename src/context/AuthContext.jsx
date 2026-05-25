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
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Al hacer login necesitamos trabajo asíncrono (fetch perfil),
        // así que activamos cargando para que ProtectedRoute espere.
        if (!cancelled) setCargando(true);

        const result = await getIdTokenResult(user);
        if (cancelled) return;
        setUsuario(user);
        setToken(result.token);
        try {
          const { data } = await api.get('/api/auth/perfil');
          if (cancelled) return;
          setPerfil(data);
        } catch {
          if (cancelled) return;
          setPerfil(null);
        }
        if (!cancelled) setCargando(false);
      } else {
        // Al cerrar sesión no hay trabajo asíncrono: limpiamos estado
        // directamente sin pasar por cargando=true para evitar el flash
        // del spinner en ProtectedRoute. En la carga inicial, cargando
        // ya es true por el useState(true), así que tampoco es necesario.
        if (cancelled) return;
        setUsuario(null);
        setPerfil(null);
        setToken(null);
        setCargando(false);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const updatePerfil = (updates) => {
    setPerfil((prev) => ({ ...prev, ...updates }));
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ usuario, perfil, updatePerfil, token, cargando, rol: perfil?.rol ?? null, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
