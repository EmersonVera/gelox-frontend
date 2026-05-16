import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../auth/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setPerfil(null);
      }
      const perfilGuardado = localStorage.getItem('gelox_perfil');
      if (user && perfilGuardado) {
        setPerfil(JSON.parse(perfilGuardado));
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setPerfil(null);
    localStorage.removeItem('gelox_perfil');
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, perfil, setPerfil, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
