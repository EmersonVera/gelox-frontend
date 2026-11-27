// src/pages/ventas/CreditoComerciante.jsx — RF65: vista de crédito de un comerciante
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import SeccionCredito from '../../components/ventas/SeccionCredito';

export default function CreditoComerciante() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();
  const comerciante = location.state?.comerciante;

  // ── Guardia: sin datos de navegación ──────────────────────────────────────
  if (!comerciante) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="font-['Inter'] text-[15px] text-[#78716c]">Información no disponible.</p>
          <button
            onClick={() => navigate('/ventas/comerciantes')}
            className="bg-[#9e2016] hover:bg-[#c0392b] text-white font-['Manrope'] font-bold px-5 py-2.5 rounded-[10px] transition-colors cursor-pointer"
          >
            Volver a Mis Comerciantes
          </button>
        </div>
      </AppLayout>
    );
  }

  const iniciales = comerciante.nombre
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 animate-fade-in-up">

        {/* ── Breadcrumb ── */}
        <button
          onClick={() => navigate('/ventas/comerciantes')}
          className="flex items-center gap-1.5 text-[#78716c] hover:text-[#1b1b1c] transition-colors w-fit font-['Inter'] text-[13px] cursor-pointer"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver a Mis Comerciantes
        </button>

        {/* ── Identificación del comerciante ── */}
        <div className="bg-white rounded-[16px] border border-[#f5f5f4] px-4 sm:px-6 py-4 flex items-center gap-4">
          {comerciante.fotoUrl ? (
            <img
              src={comerciante.fotoUrl}
              alt={comerciante.nombre}
              className="w-[60px] h-[60px] rounded-[10px] object-cover shrink-0"
            />
          ) : (
            <div className="w-[60px] h-[60px] rounded-[10px] bg-[#f6f3f3] flex items-center justify-center shrink-0">
              <span className="font-['Manrope'] font-bold text-[20px] text-[#9e2016]">{iniciales}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-['Manrope'] font-extrabold text-[18px] sm:text-[24px] text-[#1b1b1c] leading-tight truncate">
              {comerciante.nombre}
            </h1>
            <p className="font-['Inter'] text-[13px] text-[#78716c] mt-0.5">
              Municipio de {comerciante.municipio}
            </p>
          </div>
        </div>

        {/* ══ CRÉDITO (RF65) — editable solo para el Gerente ══════════════════ */}
        <SeccionCredito key={id} comercianteId={id} nombre={comerciante.nombre} />

      </div>
    </AppLayout>
  );
}
