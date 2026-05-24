import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const ACCESOS_RAPIDOS = [
  {
    icon:  <TruckIcon />,
    label: 'Ventas Rurales',
    desc:  'Registra pedidos con entrega rural',
    to:    '/ventas/pedidos-rurales',
    color: 'bg-[#9e2016]/10 text-[#9e2016]',
  },
  {
    icon:  <BarChartIcon />,
    label: 'Reportes',
    desc:  'Consulta el historial de ventas',
    to:    '/ventas/reportes',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    icon:  <UsersIcon />,
    label: 'Comerciantes',
    desc:  'Lista de comerciantes registrados',
    to:    '/ventas/comerciantes',
    color: 'bg-emerald-50 text-emerald-700',
  },
];

export default function DashboardVentas() {
  const { perfil } = useAuth();
  const navigate   = useNavigate();

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">

        {/* Bienvenida */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#9e2016]/10 flex items-center justify-center shrink-0">
            <span className="text-[#9e2016] text-xl font-bold font-display">
              {perfil?.nombre?.charAt(0)?.toUpperCase() ?? 'V'}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight font-display">
              {saludo}, {perfil?.nombre ?? 'Encargado'} 👋
            </h1>
            <p className="text-sm text-zinc-500 font-inter mt-0.5">
              Panel de Encargado de Ventas · {new Date().toLocaleDateString('es-CO', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest font-inter mb-4">
            Accesos rápidos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ACCESOS_RAPIDOS.map(({ icon, label, desc, to, color }) => (
              <button
                key={to}
                type="button"
                onClick={() => navigate(to)}
                className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110`}>
                  {icon}
                </div>
                <p className="font-semibold text-zinc-900 font-display text-sm">{label}</p>
                <p className="text-xs text-zinc-500 font-inter mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Métricas — próximamente */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-zinc-500 font-inter">
            Las métricas y estadísticas de ventas estarán disponibles próximamente.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
