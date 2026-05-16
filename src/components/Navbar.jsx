import { useAuth } from '../context/AuthContext';
import styles from '../styles/navbar.module.css';

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

export default function Navbar() {
  const { perfil } = useAuth();
  const cargo = CARGO_LABEL[perfil?.rol] ?? '';

  return (
    <header className={styles.navbar}>
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
