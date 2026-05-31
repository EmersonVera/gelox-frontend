import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult, signOut } from 'firebase/auth';
import { auth } from '../auth/firebase';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

const INACTIVITY_MS      = 30 * 60 * 1000;      // 30 minutos sin actividad → cierra sesión
const CLOSED_TAB_MS      = 24 * 60 * 60 * 1000; // pestaña cerrada > 1 día → cierra sesión
const LAST_ACTIVITY_KEY  = 'gelox_last_activity';
const ACTIVITY_EVENTS    = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);
  const inactivityTimer = useRef(null);

  // ── Verificar si la pestaña estuvo cerrada más de 1 día ──
  useEffect(() => {
    const last = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (last && Date.now() - Number(last) > CLOSED_TAB_MS) {
      signOut(auth);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    }
  }, []);

  // ── Actualizar timestamp de actividad ──
  useEffect(() => {
    const update = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, update, { passive: true }));
    update(); // marcar actividad al montar
    return () => ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, update));
  }, []);

  // ── Timer de inactividad (solo cuando hay sesión activa) ──
  useEffect(() => {
    if (!usuario) {
      clearTimeout(inactivityTimer.current);
      return;
    }
    const reset = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => signOut(auth), INACTIVITY_MS);
    };
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(inactivityTimer.current);
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [usuario]);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
