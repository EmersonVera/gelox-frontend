import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const MOCK = [
  { posicion: 1, nombre: 'Carlos Julio Ruiz',     ingreso: 320000 },
  { posicion: 2, nombre: 'Martha Lucia Gomez',    ingreso: 285000 },
  { posicion: 3, nombre: 'Humberto Suarez',       ingreso: 240000 },
  { posicion: 4, nombre: 'Beatriz Pinzón',        ingreso: 190000 },
  { posicion: 5, nombre: 'Jorge Eliécer',         ingreso: 145000 },
];

function formatCOP(n) {
  return '$' + n.toLocaleString('es-CO');
}

export default function Top5Comerciantes() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setData(MOCK);
      setCargando(false);
      return;
    }
    fetch('/api/dashboard/top5-comerciantes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {
        setData(MOCK);
        setError('No se pudo conectar al servidor. Mostrando datos de ejemplo.');
      })
      .finally(() => setCargando(false));
  }, [token]);

  const maxIngreso = data ? Math.max(...data.map((c) => c.ingreso)) : 1;

  return (
    <div className="bg-white border border-[rgba(245,245,244,0.5)] rounded-[12px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-[33px] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c] leading-[28px]">
          Top 5 Comerciantes
        </h3>
        <a
          href="#"
          className="font-['Inter'] font-medium text-[13px] text-[#9e2016] hover:underline"
        >
          Ver todos →
        </a>
      </div>

      {/* Body */}
      {cargando ? (
        <div className="flex flex-col gap-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-4 bg-[#f5f5f4] rounded animate-pulse w-3/4" />
              <div className="h-2 bg-[#f5f5f4] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {error && (
            <p className="text-[11px] font-['Inter'] text-[#a8a29e]">{error}</p>
          )}
          <div className="flex flex-col gap-5">
            {data.map((c) => {
              const pct = Math.round((c.ingreso / maxIngreso) * 100);
              return (
                <div key={c.posicion} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-['Inter'] font-medium text-[14px] text-[#1b1b1c] leading-[20px]">
                      {c.nombre}
                    </span>
                    <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c] leading-[20px]">
                      {formatCOP(c.ingreso)}
                    </span>
                  </div>
                  <div className="h-[6px] rounded-full bg-[#f5f5f4] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#9e2016] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
