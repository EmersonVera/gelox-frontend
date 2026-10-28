// src/pages/DistribuidoraBloqueada.jsx — RF59: pantalla informativa de distribuidora suspendida o inactiva
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BLOQUEO_STORAGE_KEY } from '../api/axiosConfig';

/* ── Icons ── */
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}


function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const Nombre = ({ children }) => <strong className="font-semibold text-ink">{children}</strong>;

/*
 * Textos exactos de la tabla 2.12.3 del FP-15 (Figura 21): título, explicación, contacto
 * (correo y WhatsApp de soporte de la plataforma) y botón «Cerrar sesión».
 * El motivo interno del cambio de estado no se muestra.
 */
const CONTENIDO = {
  DISTRIBUIDORA_SUSPENDIDA: {
    icono: <LockIcon />,
    iconoClase: 'bg-primary-tint text-primary',
    badge: 'Suspendido por mora',
    badgeClase: 'bg-error-bg text-error-fg',
    dot: 'bg-danger',
    titulo: 'Tu distribuidora está suspendida',
    texto: (nombre) => (
      <>
        El acceso de <Nombre>{nombre}</Nombre> a GELOX está suspendido temporalmente. Tus datos se conservan y el
        servicio se reactiva en cuanto se resuelva la situación con la administración de la plataforma.
      </>
    ),
  },
  DISTRIBUIDORA_INACTIVA: {
    icono: <ArchiveIcon />,
    iconoClase: 'bg-surface text-faint',
    badge: 'Inactivo / Archivado',
    badgeClase: 'bg-border text-faint',
    dot: 'bg-muted',
    titulo: 'Esta distribuidora ya no está activa',
    texto: (nombre) => (
      <>
        La cuenta de <Nombre>{nombre}</Nombre> fue dada de baja en la plataforma GELOX. Si crees que se trata de un
        error, comunícate con nosotros.
      </>
    ),
  },
};

function leerBloqueo() {
  try {
    return JSON.parse(sessionStorage.getItem(BLOQUEO_STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function Canal({ icono, iconoClase, etiqueta, valor, href }) {
  const contenido = (
    <>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconoClase}`}>{icono}</span>
      <div className="min-w-0 text-left">
        <p className="text-[11px] text-muted leading-tight">{etiqueta}</p>
        <p className="text-sm font-semibold text-ink break-all">{valor}</p>
      </div>
    </>
  );
  const clase = 'flex items-center gap-3 px-4 py-3 rounded-xl bg-surface';
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${clase} hover:bg-border transition duration-300`}>
      {contenido}
    </a>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

export default function DistribuidoraBloqueada() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [bloqueo] = useState(leerBloqueo);
  const [saliendo, setSaliendo] = useState(false);

  const contenido = CONTENIDO[bloqueo?.codigo];
  if (!contenido) return <Navigate to="/login" replace />;

  const nombre = bloqueo.distribuidora || 'tu distribuidora';
  // Contrato 2.9.5: contacto = { correo, whatsapp } de la plataforma (no de la distribuidora bloqueada).
  const { correo, whatsapp } = bloqueo.contacto ?? {};
  const digitosWhatsapp = String(whatsapp ?? '').replace(/\D/g, '');

  const cerrarSesion = async () => {
    setSaliendo(true);
    try {
      await logout();
    } finally {
      try { sessionStorage.removeItem(BLOQUEO_STORAGE_KEY); } catch { /* sessionStorage no disponible */ }
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EBEBEB] relative overflow-hidden">
      {/* Decorative background circles (mismo fondo del Login) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-primary-tint/40 blur-3xl" />
      </div>

      <main className="flex flex-col items-center justify-center flex-1 px-4 py-12 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in-up">
          <div className="text-4xl mb-2 leading-none">✳</div>
          <h1 className="font-display text-3xl font-extrabold text-primary tracking-tight">GELOX</h1>
          <p className="text-sm text-muted mt-1">Gestión Distribuidora</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-8 animate-fade-in-up [animation-delay:80ms]">
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${contenido.iconoClase}`}>
              {contenido.icono}
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${contenido.badgeClase}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${contenido.dot}`} />
              {contenido.badge}
            </span>
            <h2 className="font-display text-xl font-extrabold text-ink tracking-tight">{contenido.titulo}</h2>
            <p className="text-sm text-muted leading-relaxed">{contenido.texto(nombre)}</p>
          </div>

          {(correo || whatsapp) && (
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs font-semibold text-faint uppercase tracking-wider mb-3">Canales de contacto</p>
              <div className="flex flex-col gap-2">
                {correo && (
                  <Canal
                    icono={<MailIcon />}
                    iconoClase="bg-primary-tint text-primary"
                    etiqueta="Correo de soporte"
                    valor={correo}
                    href={`mailto:${correo}`}
                  />
                )}
                {whatsapp && (
                  <Canal
                    icono={<ChatIcon />}
                    iconoClase="bg-emerald-50 text-emerald-600"
                    etiqueta="WhatsApp de soporte"
                    valor={whatsapp}
                    href={digitosWhatsapp ? `https://wa.me/${digitosWhatsapp}` : undefined}
                  />
                )}
              </div>
              <p className="text-[11px] text-muted mt-3">Código: {bloqueo.codigo}</p>
            </div>
          )}

          <button
            type="button"
            onClick={cerrarSesion}
            disabled={saliendo}
            className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition duration-300 active:scale-[0.97] disabled:opacity-60 shadow-[0_2px_8px_rgba(158,32,22,0.25)]"
          >
            {saliendo
              ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              : <LogoutIcon />}
            {saliendo ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </main>

      <footer className="relative z-10 text-center text-xs text-muted py-4 animate-fade-in [animation-delay:200ms]">
        © 2026 GELOX · Gestión Distribuidora
      </footer>
    </div>
  );
}
