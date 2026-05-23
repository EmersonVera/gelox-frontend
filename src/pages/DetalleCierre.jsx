// src/pages/DetalleCierre.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/AppLayout';

const formatCOP = (n) => '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2 });

function EstadoBadge({ diferencia }) {
  if (diferencia === 0) return (
    <span className="bg-[#f5f5f4] text-[#78716c] font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] px-2.5 py-1 rounded-full">
      Exacto
    </span>
  );
  if (diferencia < 0) return (
    <span className="bg-[#fef2f2] text-[#dc2626] font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] px-2.5 py-1 rounded-full">
      Déficit
    </span>
  );
  return (
    <span className="bg-[#f0fdf4] text-[#16a34a] font-['Inter'] font-bold text-[11px] uppercase tracking-[0.5px] px-2.5 py-1 rounded-full">
      Exceso
    </span>
  );
}

const CANALES_INFO = {
  ventanilla:   { label: 'Ventanilla',    desc: 'Ventas directas en mostrador',  icono: '🏪' },
  rural:        { label: 'Rural',         desc: 'Distribución en rutas rurales', icono: '🚚' },
  comerciantes: { label: 'Comerciantes',  desc: 'Pedidos de comercios aliados',  icono: '🏬' },
};

export default function DetalleCierre() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cierre, setCierre]     = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`/api/cierre-caja/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(setCierre)
      .catch((e) => {
        console.error(e);
        setCierre(null);
      })
      .finally(() => setCargando(false));
  }, [id, token]);

  /* ── Skeleton ── */
  if (cargando) return (
    <AppLayout>
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-[#f6f3f3] rounded w-64" />
        <div className="h-4 bg-[#f6f3f3] rounded w-96" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[#f6f3f3] rounded-[12px]" />
          ))}
        </div>
        <div className="h-64 bg-[#f6f3f3] rounded-[12px]" />
      </div>
    </AppLayout>
  );

  /* ── Not found ── */
  if (!cierre) return (
    <AppLayout>
      <div className="text-center font-['Inter'] text-[#78716c] py-16">
        Cierre no encontrado.
      </div>
    </AppLayout>
  );

  const dif = cierre.diferenciaTotal ?? 0;

  // Construir objeto canales desde los campos planos que ya devuelve el backend
  const canales = {
    ventanilla:   { calculado: cierre.montoCalculadoVentanilla,   fisico: cierre.montoFisicoVentanilla,   diferencia: cierre.diferenciaVentanilla },
    rural:        { calculado: cierre.montoCalculadoRural,        fisico: cierre.montoFisicoRural,        diferencia: cierre.diferenciaRural },
    comerciantes: { calculado: cierre.montoCalculadoComerciantes, fisico: cierre.montoFisicoComerciantes, diferencia: cierre.diferenciaComerciantes },
  };

  const subtextoDif =
    dif === 0
      ? { texto: 'Balance perfecto', color: 'text-[#78716c]', icono: '✓' }
      : dif < 0
      ? { texto: 'Faltante en caja', color: 'text-[#dc2626]', icono: '⚠' }
      : { texto: 'Sobrante en caja', color: 'text-[#16a34a]', icono: '↑' };

  return (
    <AppLayout>
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <EstadoBadge diferencia={dif} />
            <span className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
              Cierre #{cierre.numero ?? cierre.id?.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <h1 className="font-['Manrope'] font-bold text-[30px] text-[#1b1b1c] tracking-[-0.75px]">
            Detalle de Cierre de Caja
          </h1>
          <div className="flex items-center gap-2 text-[#78716c]">
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 1v2M10 1v2M1 6h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="font-['Inter'] font-normal text-[14px]">
              {new Date(cierre.fecha + 'T12:00:00').toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/cierres-caja')}
          className="flex items-center gap-2 border border-[#e7e5e4] bg-white rounded-[8px] px-4 py-2 font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:bg-[#f6f3f3] cursor-pointer transition-colors mt-2"
        >
          ↺ Volver al Historial
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Monto calculado */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-6 flex flex-col gap-3">
          <span className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]">
            Monto Calculado Total
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-['Manrope'] font-bold text-[28px] text-[#1b1b1c]">
              {formatCOP(cierre.montoCalculadoTotal)}
            </span>
            <span className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">COP</span>
          </div>
          <p className="font-['Inter'] font-normal text-[13px] text-[#78716c]">
            📋 Basado en registros de ventas
          </p>
        </div>

        {/* Monto físico */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-6 flex flex-col gap-3">
          <span className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]">
            Monto Físico Total
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-['Manrope'] font-bold text-[28px] text-[#1b1b1c]">
              {formatCOP(cierre.montoFisicoTotal)}
            </span>
            <span className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">COP</span>
          </div>
          <p className="font-['Inter'] font-normal text-[13px] text-[#78716c]">
            💵 Conteo físico verificado
          </p>
        </div>

        {/* Diferencia */}
        <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-6 flex flex-col gap-3">
          <span className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e]">
            Diferencia Total
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-['Manrope'] font-bold text-[28px] ${
                dif < 0 ? 'text-[#dc2626]' : dif > 0 ? 'text-[#16a34a]' : 'text-[#78716c]'
              }`}
            >
              {dif > 0 ? '+' : ''}{formatCOP(dif)}
            </span>
            <span className="font-['Inter'] font-normal text-[14px] text-[#a8a29e]">COP</span>
          </div>
          <p className={`font-['Inter'] font-normal text-[13px] ${subtextoDif.color}`}>
            {subtextoDif.icono} {subtextoDif.texto}
          </p>
        </div>
      </div>

      {/* ── Desglose por canal ── */}
      <div className="bg-white rounded-[12px] border border-[#f5f5f4] p-6 flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-4">
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <rect x="1" y="1" width="18" height="18" rx="3" stroke="#1b1b1c" strokeWidth="1.4" />
            <path d="M1 7h18M1 13h18M7 7v11M13 7v11" stroke="#1b1b1c" strokeWidth="1.4" />
          </svg>
          <h2 className="font-['Manrope'] font-semibold text-[18px] text-[#1b1b1c]">
            Desglose por Canal de Venta
          </h2>
        </div>

        {Object.entries(canales).map(([key, val], i, arr) => {
          const info      = CANALES_INFO[key] ?? { label: key, desc: '', icono: '📦' };
          const difCanal  = val.diferencia;
          return (
            <div
              key={key}
              className={`flex items-center justify-between py-5 ${
                i < arr.length - 1 ? 'border-b border-[#fafaf9]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f6f3f3] rounded-full flex items-center justify-center text-[20px]">
                  {info.icono}
                </div>
                <div>
                  <p className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c]">{info.label}</p>
                  <p className="font-['Inter'] font-normal text-[13px] text-[#a8a29e]">{info.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-12 text-right">
                <div>
                  <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-1">
                    Calculado
                  </p>
                  <p className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c]">
                    {formatCOP(val.calculado)}
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-1">
                    Físico
                  </p>
                  <p className="font-['Manrope'] font-semibold text-[16px] text-[#1b1b1c]">
                    {formatCOP(val.fisico)}
                  </p>
                </div>
                <div>
                  <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#a8a29e] mb-1">
                    Diferencia
                  </p>
                  <p
                    className={`font-['Manrope'] font-semibold text-[16px] ${
                      difCanal < 0
                        ? 'text-[#dc2626]'
                        : difCanal > 0
                        ? 'text-[#16a34a]'
                        : 'text-[#78716c]'
                    }`}
                  >
                    {difCanal > 0 ? '+' : ''}{formatCOP(difCanal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer oscuro ── */}
      <div className="bg-[#1b1b1c] rounded-[12px] p-6 grid grid-cols-4 gap-6 items-center">
        <div>
          <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#78716c] mb-1">
            ID de Transacción
          </p>
          <p className="font-['Inter'] font-medium text-[15px] text-white">
            {cierre.idTransaccion ?? `TRX-${cierre.fecha}-${cierre.id?.slice(0, 8).toUpperCase()}`}
          </p>
        </div>
        <div>
          <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#78716c] mb-1">
            Fecha de Creación
          </p>
          <p className="font-['Inter'] font-medium text-[15px] text-white">
            {cierre.fechaCreacion ?? (cierre.createdAt
              ? new Date(cierre.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
              : '—')}
          </p>
        </div>
        <div>
          <p className="font-['Inter'] font-semibold text-[11px] uppercase tracking-[0.55px] text-[#78716c] mb-1">
            Responsable
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#9e2016] shrink-0" />
            <p className="font-['Inter'] font-medium text-[15px] text-white">
              {cierre.responsable ?? '—'}
            </p>
          </div>
        </div>
        <div className="bg-[#16a34a]/20 rounded-[10px] p-3 flex items-start gap-3">
          <svg
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 20 20"
            className="shrink-0 mt-0.5"
          >
            <circle cx="10" cy="10" r="9" stroke="#16a34a" strokeWidth="1.4" />
            <path
              d="M6 10l3 3 5-5"
              stroke="#16a34a"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="font-['Inter'] font-normal text-[12px] text-white leading-[18px]">
            Este cierre ha sido auditado y aprobado automáticamente.
          </p>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
