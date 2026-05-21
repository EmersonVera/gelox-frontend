import { useAuth } from '../context/AuthContext';

/* ── Icons ── */
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
    <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-[60px] bg-white/85 backdrop-blur-md border-b border-border">
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-ink hover:bg-surface transition duration-300 active:scale-90"
        type="button"
        onClick={onToggle}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="w-px h-6 bg-divider" />

      {/* User info */}
      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-surface transition duration-300 cursor-pointer">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-ink leading-tight">{perfil?.nombre ?? '—'}</div>
          <div className="text-xs text-muted leading-tight">{cargo}</div>
        </div>
        {perfil?.foto_url ? (
          <img
            src={perfil.foto_url}
            alt={perfil.nombre}
            className="w-8 h-8 rounded-full object-cover hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-tint text-primary text-xs font-bold flex items-center justify-center shrink-0 hover:scale-105 transition duration-300">
            {getInitials(perfil?.nombre)}
          </div>
        )}
      </div>
    </header>
  );
}
