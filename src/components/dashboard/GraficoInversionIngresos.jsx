import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';

const MOCK_INVERSION = [
  { semana: 'Semana 1', ingresos: 1250000, inversion: 650000 },
  { semana: 'Semana 2', ingresos: 1800000, inversion: 950000 },
  { semana: 'Semana 3', ingresos: 1750000, inversion: 400000 },
  { semana: 'Semana 4', ingresos: 1100000, inversion: 850000 },
];

export default function GraficoInversionIngresos() {
  const { token } = useAuth();
  const [data, setData] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!token) {
      setData(MOCK_INVERSION);
      setCargando(false);
      return;
    }
    fetch('/api/dashboard/inversion-ingresos', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [token]);

  return (
    <div className="bg-white border border-[rgba(245,245,244,0.5)] rounded-[12px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-[33px] col-span-2 h-[477px] flex flex-col">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c] leading-[28px]">
            Rentabilidad Mensual
          </h3>
          <p className="font-['Inter'] font-normal text-[14px] text-[#a8a29e] leading-[20px]">
            Comparativa de Inversión vs Ingresos Reales
          </p>
        </div>
        <div className="flex gap-4 items-center mt-1">
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 rounded-full bg-[#9e2016]" />
            <span className="font-['Inter'] font-medium text-[12px] text-[#57534e]">Ingresos</span>
          </div>
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 rounded-full bg-[#d6d3d1]" />
            <span className="font-['Inter'] font-medium text-[12px] text-[#57534e]">Inversión</span>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="flex-1 bg-[#fafaf9] rounded-[8px] animate-pulse" />
      ) : (
        <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="0" stroke="#fafaf9" vertical={false} />
            <XAxis
              dataKey="semana"
              axisLine={false}
              tickLine={false}
              tick={{ fontFamily: 'Inter', fontSize: 10, fill: '#a1a1aa', fontWeight: 500 }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #f5f5f4',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: 'Inter',
              }}
              formatter={(v) => ['$' + v.toLocaleString('es-CO'), undefined]}
            />
            <Bar dataKey="ingresos"  fill="#9e2016" radius={[4, 4, 0, 0]} name="Ingresos" />
            <Bar dataKey="inversion" fill="#a1a1aa" radius={[4, 4, 0, 0]} name="Inversión" />
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
