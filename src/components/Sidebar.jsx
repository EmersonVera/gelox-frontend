import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Icons ── */
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5" />
      <path d="M3 9a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2" />
      <path d="M5 20h14a1 1 0 0 0 1-1v-7H4v7a1 1 0 0 0 1 1z" />
    </svg>
  );
}


function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const LINKS_ADMINISTRADOR = [
  { icon: <GridIcon />,  label: 'Vista General', to: '/dashboard/gerente' },
  { icon: <ChartIcon />, label: 'Reportes',      to: '/reportes' },
  { icon: <UsersIcon />, label: 'Usuarios',      to: '/usuarios' },
  { icon: <BoxIcon />,   label: 'Inventarios',   to: '/inventarios' },
  { icon: <StoreIcon />, label: 'Comerciantes',  to: '/comerciantes' },
  { icon: <CartIcon />,  label: 'Ventas',        to: '/ventas' },
];

const LINKS_INVENTARIO = [
  { icon: <BoxIcon />, label: 'Inventarios', to: '/inventarios' },
];

const LINKS_VENTAS = [
  { icon: <CartIcon />, label: 'Ventas', to: '/ventas' },
];

const MAP_LINKS = {
  ADMINISTRADOR: LINKS_ADMINISTRADOR,
  ENCARGADO_INVENTARIO: LINKS_INVENTARIO,
  ENCARGADO_VENTAS: LINKS_VENTAS,
};

const navItemBase =
  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition duration-300 active:scale-[0.97] w-full text-left font-display';

export default function Sidebar({ open, onClose }) {
  const { perfil, logout, token } = useAuth();
  const navigate = useNavigate();

  const links = MAP_LINKS[perfil?.rol] ?? LINKS_ADMINISTRADOR;

  const handleLogout = async () => {
    fetch('/api/auth/cerrar-sesion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }).catch(() => {});
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const linkClass = ({ isActive }) =>
    `${navItemBase} ${isActive ? 'bg-white border-r-4 border-[#9e2016] text-[#9e2016] font-bold' : 'text-[#78716c] font-medium hover:bg-surface hover:text-ink'}`;

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 shrink-0
        md:sticky md:top-0 md:h-screen md:translate-x-0
        bg-white border-r border-border flex flex-col z-30
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Logo */}
      <div className="px-8 pt-8 pb-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold text-[#9e2016] tracking-[-0.6px]">GELOX</div>
            <div className="font-display font-normal text-[12px] text-[#a8a29e] uppercase tracking-[1.2px] mt-1">Gestión Distribuidora</div>
          </div>
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg text-muted hover:bg-surface transition duration-300 active:scale-90"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-3 flex flex-col gap-1 overflow-y-auto">
        {links.map(({ icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClass}
            end={to.startsWith('/dashboard')}
            onClick={handleNavClick}
          >
            <span className="shrink-0">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-6 py-5 border-t border-border flex flex-col gap-0.5">
        <NavLink to="/ajustes" className={linkClass} onClick={handleNavClick}>
          <span className="shrink-0"><SettingsIcon /></span>
          Ajustes
        </NavLink>
        <button
          className={`${navItemBase} text-faint hover:bg-surface hover:text-ink`}
          onClick={handleLogout}
          type="button"
        >
          <span className="shrink-0"><LogoutIcon /></span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
