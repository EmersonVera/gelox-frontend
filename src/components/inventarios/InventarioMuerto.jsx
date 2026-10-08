// src/components/inventarios/InventarioMuerto.jsx — productos con stock sin salidas en N días
import { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAuth } from '../../context/AuthContext';

const OPCIONES_DIAS = [15, 30, 60, 90];

const formatCOP = (n) =>
  '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const formatFecha = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca';

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function InventarioMuerto() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMINISTRADOR';   // el valor inmovilizado es información de costos

  const [dias, setDias]         = useState(30);
  const [items, setItems]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    let vivo = true;
    api.get('/api/inventario/muerto', { params: { dias } })
      .then(({ data }) => { if (vivo) { setItems(Array.isArray(data) ? data : []); setError(''); } })
      .catch(() => { if (vivo) { setItems([]); setError('No se pudo cargar el inventario sin movimiento.'); } })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [dias]);

  const cambiarDias = (d) => { setCargando(true); setDias(d); };
  const valorTotal = items.reduce((s, i) => s + Number(i.valorInmovilizado || 0), 0);

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <ClockIcon />
          <div>
            <h2 className="font-['Manrope'] font-bold text-lg text-zinc-900">Inventario sin movimiento</h2>
            <p className="font-['Inter'] text-xs text-zinc-500">
              Productos con existencias que no se han vendido ni despachado en los últimos {dias} días.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {OPCIONES_DIAS.map((d) => (
            <button key={d} type="button" onClick={() => cambiarDias(d)}
              className={`px-3 py-1.5 rounded-full font-['Inter'] text-xs font-semibold transition-colors ${
                dias === d ? 'bg-red-700 text-white' : 'bg-white text-zinc-600 border border-zinc-300 hover:border-red-400'
              }`}>
              {d} días
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="px-6 py-6"><div className="bg-zinc-100 animate-pulse h-12 rounded-lg w-full" /></div>
      ) : error ? (
        <p className="px-6 py-6 font-['Inter'] text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="px-6 py-6 font-['Inter'] text-sm text-zinc-500">
          Todos los productos con stock tuvieron salidas en este período.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 text-left">
                  {['Producto', 'Stock', 'Última salida', 'Días sin movimiento', ...(esAdmin ? ['Valor inmovilizado'] : [])].map((h) => (
                    <th key={h} className="px-6 py-3 font-['Inter'] text-[11px] uppercase tracking-wider font-bold text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3">
                      <p className="font-['Inter'] text-sm font-semibold text-zinc-900">{p.nombre}</p>
                      <p className="font-['Inter'] text-xs text-zinc-400">{p.codigoTecnico}</p>
                    </td>
                    <td className="px-6 py-3 font-['Inter'] text-sm text-zinc-700">{p.stockActual} u</td>
                    <td className="px-6 py-3 font-['Inter'] text-sm text-zinc-700">{formatFecha(p.ultimaSalida)}</td>
                    <td className="px-6 py-3 font-['Inter'] text-sm font-bold text-amber-700">{p.diasSinMovimiento ?? '—'}</td>
                    {esAdmin && (
                      <td className="px-6 py-3 font-['Inter'] text-sm text-zinc-700">{formatCOP(p.valorInmovilizado)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-zinc-100 font-['Inter'] text-sm text-zinc-500">
            {items.length} producto(s) sin movimiento
            {esAdmin && <> · Capital inmovilizado: <span className="font-bold text-zinc-800">{formatCOP(valorTotal)}</span></>}
          </div>
        </>
      )}
    </div>
  );
}
