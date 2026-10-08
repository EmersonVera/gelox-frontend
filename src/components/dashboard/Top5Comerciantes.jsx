import { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';

function formatCOP(n) {
  return '$' + n.toLocaleString('es-CO');
}

export default function Top5Comerciantes() {
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard/top5-comerciantes')
      .then((r) => setData(
        (r.data?.comerciantes ?? []).map((c) => ({
          posicion: c.posicion,
          nombre: c.nombre,
          ingreso: Number(c.totalIngreso),
        }))
      ))
      .catch(() => {
        // No se muestran datos de ejemplo: podrían confundirse con comerciantes reales
        setData([]);
        setError('No se pudo cargar el ranking de comerciantes.');
      })
      .finally(() => setCargando(false));
  }, []);

  const maxIngreso = data?.length ? Math.max(...data.map((c) => c.ingreso)) : 1;

  return (
    <div className="bg-white border border-[rgba(245,245,244,0.5)] rounded-xl drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-[33px] flex flex-col gap-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-[18px] text-ink leading-[28px]">
          Top 5 Comerciantes
        </h3>
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
            <p className="text-[11px] font-inter text-[#a8a29e]">{error}</p>
          )}
          <div className="flex flex-col gap-5">
            {data.length === 0 && !error && (
              <p className="font-inter text-[14px] text-[#a8a29e]">
                Aún no hay planillas liquidadas este mes.
              </p>
            )}
            {data.map((c) => {
              const pct = Math.round((c.ingreso / maxIngreso) * 100);
              return (
                <div key={c.posicion} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-inter font-medium text-[14px] text-ink leading-[20px]">
                      {c.nombre}
                    </span>
                    <span className="font-display font-bold text-[14px] text-ink leading-[20px]">
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
