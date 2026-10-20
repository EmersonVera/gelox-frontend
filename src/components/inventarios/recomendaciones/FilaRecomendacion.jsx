import { useState } from 'react';
import { formatoCOP } from '../../voz/formato';
import {
  URGENCIAS, aCajas, cajasVigentes, costoCaja, costoVigente, margenCaja, margenVigente,
} from './recomendacionUtils';

function ChevronIcon({ abierto }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function UrgenciaBadge({ urgencia }) {
  const u = URGENCIAS[urgencia] ?? URGENCIAS.ESTABLE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-['Inter'] font-bold text-[11px] uppercase tracking-[0.4px] ${u.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
      {u.label}
    </span>
  );
}

const DECISIONES = {
  PENDIENTE:  { label: 'Pendiente',  clase: 'text-[#a8a29e]' },
  APROBADO:   { label: 'Aprobado',   clase: 'text-[#16a34a]' },
  MODIFICADO: { label: 'Modificado', clase: 'text-[#2563eb]' },
  RECHAZADO:  { label: 'Rechazado',  clase: 'text-[#dc2626]' },
};

const botonBase =
  "px-2.5 py-1.5 rounded-[8px] font-['Inter'] font-semibold text-[12px] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed";

function Dato({ titulo, valor, destacado }) {
  return (
    <div className="bg-[#f6f3f3] rounded-[10px] px-4 py-3 min-w-[120px]">
      <p className="font-['Inter'] font-bold text-[10px] uppercase tracking-[0.5px] text-[#78716c]">{titulo}</p>
      <p className={`font-['Manrope'] font-bold text-[17px] mt-2 ${destacado ?? 'text-[#1b1b1c]'}`}>{valor}</p>
    </div>
  );
}

function Detalle({ item }) {
  const u = URGENCIAS[item.urgencia] ?? URGENCIAS.ESTABLE;
  const estacionalidad = Math.round((Number(item.factorEstacionalidad) - 1) * 100);
  const ventaSemanal = aCajas(Number(item.demandaDiaria) * 7, item);
  return (
    <div className="border border-[#fecaca]/60 bg-[#fffafa] rounded-[12px] p-4 flex flex-col lg:flex-row gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        <Dato titulo="Venta prom. semanal" valor={`${ventaSemanal} cajas`} />
        <Dato titulo="Punto de reorden" valor={`${aCajas(item.puntoReorden, item)} cajas`} />
        <Dato titulo="Estacionalidad" valor={`${estacionalidad >= 0 ? '+' : ''}${estacionalidad} %`}
          destacado={estacionalidad > 0 ? 'text-[#9e2016]' : undefined} />
        <Dato titulo="Cobertura actual" valor={item.coberturaDias == null ? '—' : `${String(item.coberturaDias).replace('.', ',')} días`}
          destacado={u.texto} />
      </div>
      <p className="font-['Inter'] text-[13px] leading-relaxed text-[#57534e]">
        <span className="font-semibold text-[#1b1b1c]">¿Por qué se recomienda? </span>
        {item.justificacion}{' '}
        Costo por caja: {formatoCOP(costoCaja(item))}. Margen por caja: {formatoCOP(margenCaja(item))}.
        {item.motivoRechazo && (
          <span className="block mt-2 text-[#dc2626]">Motivo del rechazo: {item.motivoRechazo}</span>
        )}
      </p>
    </div>
  );
}

/** Fila de la lista priorizada con justificación desplegable y decisión (RF56). */
export default function FilaRecomendacion({ item, abierto, onToggle, onDecidir, bloqueado, guardando }) {
  const [modo, setModo] = useState(null); // null | 'modificar' | 'rechazar'
  const [cajas, setCajas] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const decision = DECISIONES[item.decision] ?? DECISIONES.PENDIENTE;
  const cajasActuales = cajasVigentes(item);
  const costo = costoVigente(item);
  const margen = margenVigente(item);
  const margenPct = costo > 0 ? Math.round((margen / costo) * 100) : 0;
  const deshabilitado = bloqueado || guardando;
  const stockCritico = item.urgencia !== 'ESTABLE';

  const abrirModo = (m) => {
    setError('');
    setModo((actual) => (actual === m ? null : m));
    setCajas(String(cajasActuales || item.cajasSugeridas));
    setMotivo(item.motivoRechazo ?? '');
  };

  const enviar = async (payload) => {
    const ok = await onDecidir(item, payload);
    if (ok) setModo(null);
  };

  const guardarModificacion = () => {
    const n = Number(cajas);
    if (cajas === '' || !Number.isInteger(n) || n < 0) {
      setError('Ingresa un número entero de cajas (0 o más).');
      return;
    }
    enviar({ decision: 'MODIFICADO', cajas: n });
  };

  return (
    <>
      <tr className={`border-t border-[#f5f5f4] ${item.decision === 'RECHAZADO' ? 'opacity-60' : ''}`}>
        <td className="px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#f5f5f4] flex items-center justify-center font-['Inter'] font-semibold text-[11px] text-[#57534e]">
              {item.prioridad}
            </span>
            <div className="min-w-0">
              <p className="font-['Inter'] font-semibold text-[14px] text-[#1b1b1c]">{item.producto?.nombre}</p>
              <p className="font-['Inter'] text-[12px] text-[#a8a29e]">{item.producto?.codigo}</p>
              {item.confianzaBaja && (
                <p className="font-['Inter'] text-[11px] text-[#d97706] mt-0.5">
                  ⚠ Confianza baja · {item.mesesHistorial ?? '<3'} meses de historial
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><UrgenciaBadge urgencia={item.urgencia} /></td>
        <td className={`px-4 py-3 text-right font-['Inter'] font-semibold text-[14px] ${stockCritico ? URGENCIAS[item.urgencia].texto : 'text-[#78716c]'}`}>
          {aCajas(item.stockActual, item)}
        </td>
        <td className="px-4 py-3 text-right font-['Inter'] text-[14px] text-[#1b1b1c]">
          {item.decision === 'MODIFICADO' || item.decision === 'RECHAZADO' ? (
            <span>
              <span className="line-through text-[#a8a29e] mr-1.5">{item.cajasSugeridas}</span>
              <span className="font-bold">{cajasActuales}</span>
            </span>
          ) : (
            <span className="font-bold">{item.cajasSugeridas}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-['Inter'] text-[14px] text-[#1b1b1c] whitespace-nowrap">{formatoCOP(costo)}</td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          <p className="font-['Inter'] font-semibold text-[14px] text-[#16a34a]">{formatoCOP(margen)}</p>
          <p className="font-['Inter'] text-[11px] text-[#a8a29e]">{margenPct} %</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1.5 items-start">
            <span className={`font-['Inter'] font-semibold text-[12px] ${decision.clase}`}>
              {guardando ? 'Guardando…' : decision.label}
            </span>
            <div className="flex gap-1">
              <button type="button" disabled={deshabilitado}
                onClick={() => enviar({ decision: 'APROBADO' })}
                className={`${botonBase} ${item.decision === 'APROBADO' ? 'bg-[#16a34a] text-white' : 'bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7]'}`}>
                Aprobar
              </button>
              <button type="button" disabled={deshabilitado} onClick={() => abrirModo('modificar')}
                className={`${botonBase} ${item.decision === 'MODIFICADO' || modo === 'modificar' ? 'bg-[#2563eb] text-white' : 'bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe]'}`}>
                Modificar
              </button>
              <button type="button" disabled={deshabilitado} onClick={() => abrirModo('rechazar')}
                className={`${botonBase} ${item.decision === 'RECHAZADO' || modo === 'rechazar' ? 'bg-[#dc2626] text-white' : 'bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2]'}`}>
                Rechazar
              </button>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <button type="button" onClick={onToggle} aria-expanded={abierto}
            aria-label={abierto ? 'Ocultar justificación' : 'Ver justificación'}
            className={`w-8 h-8 rounded-[8px] inline-flex items-center justify-center transition-colors ${abierto ? 'bg-[#fee2e2] text-[#9e2016]' : 'border border-[#e7e5e4] text-[#78716c] hover:bg-[#f5f5f4]'}`}>
            <ChevronIcon abierto={abierto} />
          </button>
        </td>
      </tr>

      {modo && (
        <tr>
          <td colSpan={8} className="px-4 pb-3">
            <div className="bg-[#f6f3f3] rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-3">
              {modo === 'modificar' ? (
                <>
                  <label className="font-['Inter'] text-[13px] text-[#57534e]" htmlFor={`cajas-${item.id}`}>
                    Cajas a pedir (sugeridas: {item.cajasSugeridas}). Con 0 el ítem queda rechazado.
                  </label>
                  <input id={`cajas-${item.id}`} type="number" min="0" step="1" value={cajas}
                    onChange={(e) => { setCajas(e.target.value); setError(''); }}
                    className="w-24 bg-white border border-[#e7e5e4] rounded-[8px] px-3 py-1.5 font-['Inter'] text-[14px] outline-none focus:ring-2 focus:ring-[#9e2016]/20" />
                  <button type="button" disabled={deshabilitado} onClick={guardarModificacion}
                    className={`${botonBase} bg-[#9e2016] text-white hover:bg-[#7f1a12]`}>
                    Guardar
                  </button>
                </>
              ) : (
                <>
                  <label className="font-['Inter'] text-[13px] text-[#57534e]" htmlFor={`motivo-${item.id}`}>
                    Motivo del rechazo (opcional)
                  </label>
                  <input id={`motivo-${item.id}`} type="text" maxLength={200} value={motivo}
                    onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: hay stock suficiente en bodega"
                    className="flex-1 min-w-[200px] bg-white border border-[#e7e5e4] rounded-[8px] px-3 py-1.5 font-['Inter'] text-[14px] outline-none focus:ring-2 focus:ring-[#9e2016]/20" />
                  <button type="button" disabled={deshabilitado}
                    onClick={() => enviar({ decision: 'RECHAZADO', motivo: motivo.trim() || undefined })}
                    className={`${botonBase} bg-[#dc2626] text-white hover:bg-[#b91c1c]`}>
                    Confirmar rechazo
                  </button>
                </>
              )}
              <button type="button" onClick={() => setModo(null)}
                className={`${botonBase} text-[#78716c] hover:bg-white`}>
                Cancelar
              </button>
              {error && <p className="w-full font-['Inter'] text-[12px] text-[#dc2626]">{error}</p>}
            </div>
          </td>
        </tr>
      )}

      {abierto && (
        <tr>
          <td colSpan={8} className="px-4 pb-4"><Detalle item={item} /></td>
        </tr>
      )}
    </>
  );
}
