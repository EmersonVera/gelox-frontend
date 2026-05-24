import { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';

function DollarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function formatCOP(n) {
  return '$' + n.toLocaleString('es-CO');
}

function Badge({ valor, tipo }) {
  if (tipo === 'porcentaje') {
    const positivo = valor >= 0;
    return (
      <span className={`text-xs font-bold px-2 py-1 rounded-full font-inter ${
        positivo ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#fef2f2] text-[#dc2626]'
      }`}>
        {positivo ? '+' : ''}{valor}%
      </span>
    );
  }
  const colores = {
    Alto:  'bg-[#fff7ed] text-[#ea580c]',
    Medio: 'bg-[#fefce8] text-[#ca8a04]',
    Bajo:  'bg-[#fef2f2] text-[#dc2626]',
  };
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full font-inter ${colores[valor] ?? colores.Bajo}`}>
      {valor}
    </span>
  );
}

const MOCK_KPIS = {
  ingresosDia:   { valor: 1250000, variacion: 12 },
  gananciaNeta:  { valor: 450000,  variacion: 5  },
  comerciantes:  { activos: 24, total: 26, estado: 'Alto' },
};

export default function KpiCards() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard/kpis')
      .then((r) => setData(r.data))
      .catch(() => setError('No se pudo cargar los indicadores.'))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return (
    <div className="grid grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl p-[25px] h-[149px] animate-pulse border border-[rgba(245,245,244,0.5)]" />
      ))}
    </div>
  );

  if (error || !data) return (
    <p className="text-sm text-[#78716c]">{error || 'Sin datos'}</p>
  );

  const pctActivos = data.totalComerciantes > 0
    ? (data.comerciantesActivos / data.totalComerciantes) * 100
    : 0;
  const estadoActivos = pctActivos > 80 ? 'Alto' : pctActivos > 50 ? 'Medio' : 'Bajo';

  const cards = [
    {
      label: 'Ingresos del día',
      valor: formatCOP(Number(data.ingresosDia)),
      sufijo: 'COP',
      badge: <Badge valor={data.variacionIngresos != null ? Number(data.variacionIngresos) : 0} tipo="porcentaje" />,
      icono: <DollarIcon />,
    },
    {
      label: 'Ganancia neta Diaria',
      valor: formatCOP(Number(data.gananciaNeta)),
      sufijo: 'COP',
      badge: <Badge valor={data.variacionGanancia != null ? Number(data.variacionGanancia) : 0} tipo="porcentaje" />,
      icono: <TrendingUpIcon />,
    },
    {
      label: 'Comerciantes activos',
      valor: String(data.comerciantesActivos),
      sufijo: `/ ${data.totalComerciantes}`,
      badge: <Badge valor={estadoActivos} tipo="cualitativo" />,
      icono: <UsersIcon />,
    },
  ];

  const DELAYS = ['', '[animation-delay:80ms]', '[animation-delay:160ms]'];

  return (
    <div className="grid grid-cols-3 gap-x-6">
      {cards.map((c, idx) => (
        <div
          key={c.label}
          className={`bg-white border border-[rgba(245,245,244,0.5)] rounded-xl drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-[25px] flex flex-col animate-fade-in-up ${DELAYS[idx]}`}
        >
          <div className="flex items-start justify-between pb-4">
            <div className="opacity-60">{c.icono}</div>
            {c.badge}
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-inter font-bold text-[10px] text-[#a8a29e] uppercase tracking-[0.5px]">
              {c.label}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-[24px] text-ink leading-[32px]">
                {c.valor}
              </span>
              <span className="font-display font-normal text-[14px] text-[#a8a29e] leading-[20px]">
                {c.sufijo}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
