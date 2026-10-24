import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { obtenerIdentidad, actualizarIdentidad } from '../services/distribuidoraService';
import { esHexValido, oscurecer, tintar } from './identidadUtils';

const IdentidadContext = createContext(null);

const TITULO_POR_DEFECTO  = 'GELOX';
const FAVICON_POR_DEFECTO = '/favicon.svg';
const TOKENS = ['--color-primary', '--color-primary-dark', '--color-primary-tint', '--color-secundario'];

function apuntarFavicon(href) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.removeAttribute('type');
  link.href = href;
}

/**
 * Sobrescribe en <html> los tokens de Tailwind de src/index.css, de modo que
 * bg-primary, text-primary y similares toman los colores de la distribuidora
 * sin tocar los componentes. Sin identidad se vuelve a los valores de index.css.
 */
function aplicarIdentidad(identidad) {
  const estilo = document.documentElement.style;
  TOKENS.forEach((t) => estilo.removeProperty(t));

  if (!identidad) {
    document.title = TITULO_POR_DEFECTO;
    apuntarFavicon(FAVICON_POR_DEFECTO);
    return;
  }

  const { nombreComercial, faviconUrl, colorPrimario, colorSecundario } = identidad;
  if (esHexValido(colorPrimario)) {
    estilo.setProperty('--color-primary', colorPrimario);
    estilo.setProperty('--color-primary-dark', oscurecer(colorPrimario));
    estilo.setProperty('--color-primary-tint', tintar(colorPrimario));
  }
  if (esHexValido(colorSecundario)) {
    estilo.setProperty('--color-secundario', colorSecundario);
  }
  document.title = nombreComercial ? `${nombreComercial} · GELOX` : TITULO_POR_DEFECTO;
  apuntarFavicon(faviconUrl || FAVICON_POR_DEFECTO);
}

export function IdentidadProvider({ children }) {
  const { usuario } = useAuth();
  // La identidad queda asociada al uid que la pidió: al cerrar sesión o cambiar
  // de usuario deja de aplicarse sin esperar a la siguiente respuesta.
  const [estado, setEstado] = useState(null); // { uid, datos }

  const uid = usuario?.uid ?? null;
  const identidad = uid && estado?.uid === uid ? estado.datos : null;
  const cargando  = Boolean(uid) && estado?.uid !== uid;

  useEffect(() => {
    if (!uid) return;
    let vivo = true;
    obtenerIdentidad()
      .then((datos) => { if (vivo) setEstado({ uid, datos }); })
      .catch(() => { if (vivo) setEstado({ uid, datos: null }); });
    return () => { vivo = false; };
  }, [uid]);

  useEffect(() => {
    aplicarIdentidad(identidad);
  }, [identidad]);

  /** PUT multipart; si responde bien, la interfaz cambia sin recargar. */
  const actualizar = async (formData) => {
    const datos = await actualizarIdentidad(formData);
    setEstado({ uid, datos });
    return datos;
  };

  /** Reemplaza la identidad aplicada (usado por el modo simulado). */
  const establecer = (datos) => setEstado({ uid, datos });

  return (
    <IdentidadContext.Provider value={{ identidad, cargando, actualizar, establecer }}>
      {children}
    </IdentidadContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIdentidad() {
  const ctx = useContext(IdentidadContext);
  if (!ctx) throw new Error('useIdentidad debe usarse dentro de IdentidadProvider');
  return ctx;
}
