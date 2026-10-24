import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

/* ── Icons ── */
function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h.01M15 10h.01" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
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

const NUEVA = '/plataforma/distribuidoras/nueva';

/* "Distribuidoras" queda activo en la lista y en el detalle, pero no en el formulario de registro. */
const LINKS = [
  {
    icon: <BuildingIcon />, label: 'Distribuidoras', to: '/plataforma/distribuidoras',
    activo: (path) => path.startsWith('/plataforma/distribuidoras') && path !== NUEVA,
  },
  { icon: <PlusCircleIcon />, label: 'Nueva distribuidora', to: NUEVA, activo: (path) => path === NUEVA },
];

const navItemBase =
  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition duration-300 active:scale-[0.97] w-full text-left font-display';

const claseLink = (activo) =>
  `${navItemBase} ${activo
    ? 'bg-white border-r-4 border-[#9e2016] text-[#9e2016] font-bold'
    : 'text-[#78716c] font-medium hover:bg-surface hover:text-ink'
  }`;

export default function SidebarPlataforma({ open, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = async () => {
    api.post('/api/auth/cerrar-sesion').catch(() => {});
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const handleNavClick = () => { if (onClose) onClose(); };

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
            <div className="font-display font-normal text-[12px] text-[#a8a29e] uppercase tracking-[1.2px] mt-1">
              Plataforma
            </div>
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

      {/* Rol badge */}
      <div className="px-6 pt-4 pb-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#9e2016]/60 font-inter">
          Superadministrador
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto">
        {LINKS.map(({ icon, label, to, activo }) => (
          <NavLink key={to} to={to} end className={() => claseLink(activo(pathname))} onClick={handleNavClick}>
            <span className="shrink-0">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-5 border-t border-border flex flex-col gap-0.5">
        <NavLink to="/plataforma/ajustes" className={({ isActive }) => claseLink(isActive)} onClick={handleNavClick}>
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
