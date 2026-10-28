import { formatoCOP } from '../../voz/formato';
import { URGENCIAS } from './recomendacionUtils';

/**
 * Costo aprobado frente al presupuesto (RF55), repartido por urgencia. Solo cuentan los
 * ítems aprobados o modificados; los pendientes y rechazados no consumen presupuesto.
 */
export default function BarraPresupuesto({ presupuesto, costoAprobado, costoSugerido, porUrgencia }) {
  const total = Number(presupuesto) || 0;
  const libre = Math.max(0, total - costoAprobado);
  const pct = (v) => (total > 0 ? Math.min(100, (v / total) * 100) : 0);
  const excedido = costoAprobado > total;

  return (
    <section className="bg-white rounded-[12px] border border-[#f5f5f4] p-5 flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#78716c]">Costo aprobado</p>
          <p className="font-['Manrope'] font-bold text-[22px] text-[#1b1b1c] mt-1">
            {formatoCOP(costoAprobado)}{' '}
            <span className="font-['Inter'] font-normal text-[14px] text-[#78716c]">de {formatoCOP(total)} de presupuesto</span>
          </p>
          <p className="font-['Inter'] text-[12px] text-[#a8a29e] mt-0.5">Sugerido por el sistema: {formatoCOP(costoSugerido)}</p>
        </div>
        <div className="text-right">
          <p className="font-['Inter'] font-bold text-[11px] uppercase tracking-[0.55px] text-[#78716c]">
            {excedido ? 'Excedido' : 'Disponible'}
          </p>
          <p className={`font-['Manrope'] font-bold text-[22px] mt-1 ${excedido ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>
            {formatoCOP(excedido ? costoAprobado - total : libre)}
          </p>
        </div>
      </div>

      <div className="h-3 w-full rounded-full bg-[#f5f5f4] overflow-hidden flex" role="img"
        aria-label={`${pct(costoAprobado).toFixed(1)} % del presupuesto aprobado`}>
        {Object.entries(URGENCIAS).map(([clave, u]) => (
          <div key={clave} className={`${u.barra} h-full transition-all duration-500`} style={{ width: `${pct(porUrgencia[clave] ?? 0)}%` }} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap font-['Inter'] text-[12px] text-[#57534e]">
          {Object.entries(URGENCIAS).map(([clave, u]) => (
            <span key={clave} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${u.barra}`} />
              {u.label} {formatoCOP(porUrgencia[clave] ?? 0)}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#e7e5e4]" />
            Libre {formatoCOP(libre)}
          </span>
        </div>
        <span className="font-['Inter'] font-semibold text-[13px] text-[#1b1b1c]">
          {total > 0 ? `${((costoAprobado / total) * 100).toFixed(1).replace('.', ',')} % aprobado` : '—'}
        </span>
      </div>
    </section>
  );
}
