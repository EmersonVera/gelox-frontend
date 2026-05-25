import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';

/* ── Icons ── */
function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function PackageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function TrendingDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}
function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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

/* ── Nav Links
 *  pronto: true  → ítem no disponible aún: badge "Pronto", sin navegación
 *  pronto: false → ítem funcional: NavLink con estado activo
 * ─────────────────────────────────────────────────────────────────── */
const LINKS = [
  { icon: <PackageIcon />,      label: 'Gestión de Inventarios', to: '/inventarios/gestion',        pronto: false },
  { icon: <TrendingDownIcon />, label: 'Registro de Merma',      to: '/inventarios/merma',          pronto: false },
  { icon: <InboxIcon />,        label: 'Registro de Entrada',    to: '/inventarios/entrada',        pronto: false },
  { icon: <GridIcon />,         label: 'Catálogo',               to: '/inventarios/catalogo',       pronto: false },
  { icon: <ClipboardIcon />,    label: 'Generar Pedido',         to: '/inventarios/generar-pedido', pronto: false },
  { icon: <FileTextIcon />,     label: 'Reporte Pedido',         to: '/inventarios/reporte-pedido', pronto: false },
];

const navItemBase =
  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition duration-300 active:scale-[0.97] w-full text-left font-display';

export default function SidebarInventarios({ open, onClose }) {
  const { logout, rol } = useAuth();
  const navigate = useNavigate();

  const isAdmin = rol === 'ADMINISTRADOR';

  const handleLogout = async () => {
    api.post('/api/auth/cerrar-sesion').catch(() => {});
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const handleBackToAdmin = () => {
    if (onClose) onClose();
    navigate('/dashboard/gerente');
  };

  const activeLinkClass = ({ isActive }) =>
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
      {/* ── Logo ── */}
      <div className="px-8 pt-8 pb-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold text-[#9e2016] tracking-[-0.6px]">GELOX</div>
            <div className="font-display font-normal text-[12px] text-[#a8a29e] uppercase tracking-[1.2px] mt-1">
              Inventarios
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

      {/* ── Botón volver a Admin — solo para ADMINISTRADOR ── */}
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

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 py-3 flex flex-col gap-1 overflow-y-auto">
        {LINKS.map(({ icon, label, to, pronto }) =>
          pronto ? (
            /* Ítem no disponible: no navega, muestra badge "Pronto" */
            <div
              key={to}
              className={`${navItemBase} text-[#c4bfbb] cursor-default select-none justify-between`}
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 opacity-50">{icon}</span>
                {label}
              </div>
              <span className="text-[10px] font-semibold tracking-wide bg-zinc-100 text-zinc-400 rounded-full px-2 py-0.5 font-inter shrink-0">
                Pronto
              </span>
            </div>
          ) : (
            /* Ítem funcional */
            <NavLink
              key={to}
              to={to}
              className={activeLinkClass}
              onClick={handleNavClick}
            >
              <span className="shrink-0">{icon}</span>
              {label}
            </NavLink>
          )
        )}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-4 py-5 border-t border-border flex flex-col gap-0.5">
        {/* Ajustes bajo /inventarios/ para que el dispatcher mantenga esta sidebar */}
        <NavLink to="/inventarios/ajustes" className={activeLinkClass} onClick={handleNavClick}>
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
