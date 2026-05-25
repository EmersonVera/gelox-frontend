import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

/* ── Icons ── */
function TruckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
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

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/* ─── Nav Links ── */
const LINKS = [
  { icon: <TruckIcon />,    label: 'Ventas',       to: '/ventas/pedidos-ventanilla' },
  { icon: <BarChartIcon />, label: 'Reportes',     to: '/ventas/reportes' },
  { icon: <UsersIcon />,    label: 'Comerciantes', to: '/ventas/comerciantes' },
];

const navItemBase =
  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition duration-300 active:scale-[0.97] w-full text-left font-display';

export default function SidebarVentas({ open, onClose }) {
  const { perfil, logout, rol } = useAuth();
  const navigate = useNavigate();

  const isAdmin = rol === 'ADMINISTRADOR';

  const handleBackToAdmin = () => {
    if (onClose) onClose();
    navigate('/dashboard/gerente');
  };

  const handleLogout = async () => {
    api.post('/api/auth/cerrar-sesion').catch(() => {});
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const linkClass = ({ isActive }) =>
    `${navItemBase} ${isActive
      ? 'bg-white border-r-4 border-[#9e2016] text-[#9e2016] font-bold shadow-sm'
      : 'text-[#78716c] font-medium hover:bg-surface hover:text-ink'
    }`;

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
              Gestión Distribuidora
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

      {/* Botón volver a Admin — solo para ADMINISTRADOR */}
      {isAdmin && (
        <div className="px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={handleBackToAdmin}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold
              text-[#9e2016] bg-[#9e2016]/8 hover:bg-[#9e2016]/15
              transition duration-300 active:scale-[0.97] font-display"
          >
            <ArrowLeftIcon />
            Volver a Admin
          </button>
        </div>
      )}



      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto">
        <p className="px-4 pb-1 pt-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 font-inter">
          Módulos
        </p>
        {LINKS.map(({ icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClass}
            onClick={handleNavClick}
          >
            <span className="shrink-0">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-5 border-t border-border flex flex-col gap-0.5">
        {/* Ajustes bajo /ventas/ para que el dispatcher mantenga esta sidebar */}
        <NavLink to="/ventas/ajustes" className={linkClass} onClick={handleNavClick}>
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
