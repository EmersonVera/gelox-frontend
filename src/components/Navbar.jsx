import { useAuth } from '../context/AuthContext';
import styles from '../styles/navbar.module.css';

/* ── Icons ── */
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}

const CARGO_LABEL = {
  ADMINISTRADOR:        'Gerente General',
  ENCARGADO_INVENTARIO: 'Encargado de Inventario',
  ENCARGADO_VENTAS:     'Encargado de Ventas',
};

function getInitials(nombre) {
  if (!nombre) return '?';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function Navbar({ onToggle, sidebarOpen }) {
  const { perfil } = useAuth();
  const cargo = CARGO_LABEL[perfil?.rol] ?? '';

  return (
    <header className={styles.navbar}>
      {/* Botón hamburguesa — solo visible en móvil */}
      <button
        className={styles.hamburger}
        type="button"
        onClick={onToggle}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {/* Spacer para empujar el resto a la derecha */}
      <div className={styles.spacer} />

      <button className={styles.bellBtn} type="button" aria-label="Notificaciones">
        <BellIcon />
      </button>

      <div className={styles.divider} />

      <div className={styles.userInfo}>
        <div className={styles.userTexts}>
          <div className={styles.userName}>{perfil?.nombre ?? '—'}</div>
          <div className={styles.userRole}>{cargo}</div>
        </div>
        {perfil?.foto_url ? (
          <img
            src={perfil.foto_url}
            alt={perfil.nombre}
            className={styles.avatarImg}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {getInitials(perfil?.nombre)}
          </div>
        )}
      </div>
    </header>
  );
}
