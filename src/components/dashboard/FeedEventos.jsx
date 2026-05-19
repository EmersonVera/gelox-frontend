import { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';

const MOCK = [
  { tipo: 'DESPACHO',       descripcion: 'Juan Pérez registró despacho de 45 unidades.',          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { tipo: 'CIERRE_CAJA',    descripcion: 'Cierre de caja ventanilla completado por Ayde.',         timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString() },
  { tipo: 'ALERTA_STOCK',   descripcion: 'Alerta: Bajo stock en Corneto Vainilla (quedan 12u).',   timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { tipo: 'NUEVO_REGISTRO', descripcion: 'Nuevo comerciante registrado: Luis Carlos Sarmiento.',   timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
];

function tiempoRelativo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diffMs / 60000);
  const horas = Math.floor(mins / 60);
  const dias  = Math.floor(horas / 24);
  if (dias >= 1)  return `HACE ${dias} DÍA${dias > 1 ? 'S' : ''}`;
  if (horas >= 1) return `HACE ${horas} HORA${horas > 1 ? 'S' : ''}`;
  if (mins >= 1)  return `HACE ${mins} MIN`;
  return 'AHORA';
}

function IconoDespacho() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconoCierreCaja() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconoAlertaStock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconoNuevoRegistro() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

const TIPO_CONFIG = {
  DESPACHO:       { Icono: IconoDespacho,       fondoIcono: 'bg-[#f5f5f4]', colorIcono: 'text-[#57534e]', textoRojo: false },
  CIERRE_CAJA:    { Icono: IconoCierreCaja,     fondoIcono: 'bg-[#f0fdf4]', colorIcono: 'text-[#16a34a]', textoRojo: false },
  ALERTA_STOCK:   { Icono: IconoAlertaStock,    fondoIcono: 'bg-[#fef2f2]', colorIcono: 'text-[#9e2016]', textoRojo: true  },
  NUEVO_REGISTRO: { Icono: IconoNuevoRegistro,  fondoIcono: 'bg-[#f5f5f4]', colorIcono: 'text-[#57534e]', textoRojo: false },
};

export default function FeedEventos() {
  const [eventos, setEventos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard/eventos')
      .then((r) => {
        const items = (r.data?.content ?? []).map((ev) => ({
          tipo: ev.tipo,
          descripcion: ev.descripcion,
          timestamp: ev.fecha,
        }));
        const ordenados = [...items].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setEventos(ordenados.slice(0, 10));
      })
      .catch(() => {
        setEventos(MOCK);
        setError('No se pudo conectar al servidor. Mostrando datos de ejemplo.');
      })
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="bg-white border border-[rgba(245,245,244,0.5)] rounded-[12px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] p-[33px] flex flex-col gap-6">
      <h3 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c] leading-[28px]">
        Actividad Reciente
      </h3>

      {cargando ? (
        <p className="font-['Inter'] text-[14px] text-[#a8a29e]">Cargando...</p>
      ) : (
        <>
          {error && (
            <p className="text-[11px] font-['Inter'] text-[#a8a29e]">{error}</p>
          )}
          <div className="flex flex-col gap-4">
            {eventos.map((ev, idx) => {
              const cfg = TIPO_CONFIG[ev.tipo] ?? TIPO_CONFIG.DESPACHO;
              const { Icono, fondoIcono, colorIcono, textoRojo } = cfg;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${fondoIcono} ${colorIcono}`}>
                    <Icono />
                  </div>
                  <div className="flex flex-col gap-[2px] min-w-0">
                    <span
                      className={`font-['Inter'] font-normal text-[13px] leading-[18px] ${
                        textoRojo ? 'text-[#9e2016]' : 'text-[#1b1b1c]'
                      }`}
                    >
                      {ev.descripcion}
                    </span>
                    <span className="font-['Inter'] font-medium text-[10px] text-[#a8a29e] tracking-[0.4px] uppercase">
                      {tiempoRelativo(ev.timestamp)}
                    </span>
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
