import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import api from '../../api/axiosConfig';

const COLORES = ['#9e2016', '#1b1b1c', '#e7e5e4'];

const MOCK_CANALES = [
  { canal: 'Comerciantes', porcentaje: 55 },
  { canal: 'Ventanilla',   porcentaje: 30 },
  { canal: 'Rural',        porcentaje: 15 },
];

export default function GraficoVentasPorCanal() {
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard/ventas-por-canal')
      .then((r) => {
        const raw = r.data;
        const items = [
          { canal: 'Comerciantes', porcentaje: Number(raw.porcentajeComerciantes ?? 0) },
          { canal: 'Ventanilla',   porcentaje: Number(raw.porcentajeVentanilla   ?? 0) },
          { canal: 'Rural',        porcentaje: Number(raw.porcentajeRural         ?? 0) },
        ];
       
        const sumParcial = items.slice(0, -1).reduce((acc, d) => acc + d.porcentaje, 0);
        items[items.length - 1].porcentaje = Number((100 - sumParcial).toFixed(2));
        setData(items);
      })
      .catch(() => setData([]))
      .finally(() => setCargando(false));
  }, []);

  const total = 100;

  return (
    <div className="bg-white border border-[rgba(245,245,244,0.5)] rounded-xl drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-[33px] col-span-1 flex flex-col animate-fade-in-up [animation-delay:120ms]">
      <h3 className="font-display font-bold text-[18px] text-ink leading-[28px] mb-1">
        Distribución de Ventas
      </h3>
      <p className="font-inter font-normal text-[14px] text-[#a8a29e] leading-[20px] mb-8">
        Canales de distribución
      </p>

      {cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[192px] h-[192px] rounded-full bg-[#f5f5f4] animate-pulse" />
        </div>
      ) : (
        <>
          {/* Dona con label central como overlay CSS */}
          <div className="relative flex justify-center">
            <PieChart width={192} height={192}>
              <Pie
                data={data}
                cx={96}
                cy={96}
                innerRadius={68}
                outerRadius={92}
                dataKey="porcentaje"
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`${v}%`, undefined]}
                contentStyle={{ fontFamily: 'Inter', fontSize: 12, borderRadius: 12, border: '1px solid #f5f5f4' }}
              />
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-display font-bold text-[30px] text-ink leading-none">
                {Number(total.toFixed(2))}%
              </span>
              <span className="font-inter font-bold text-[10px] text-[#a8a29e] uppercase tracking-[0.5px] mt-1">
                TOTAL
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            {data.map((d, i) => (
              <div key={d.canal} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORES[i] }} />
                  <span className="font-inter font-normal text-[14px] text-ink leading-[20px]">
                    {d.canal}
                  </span>
                </div>
                <span className="font-inter font-bold text-[14px] text-ink leading-[20px]">
                  {d.porcentaje}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
