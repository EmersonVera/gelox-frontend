// src/pages/ventas/MisComerciantess.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/AppLayout';
import NuevoComerciante from '../../components/comerciantes/NuevoComerciante';
import SuccessToast from '../../components/SuccessToast';

export default function MisComerciantess() {
  const { token } = useAuth();
  const [comerciantes, setComerciantess] = useState([]);
  const [total, setTotal]               = useState(0);
  const [busqueda, setBusqueda]         = useState('');
  const [cargando, setCargando]         = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [toast, setToast]               = useState({ show: false, message: '' });

  const fetchComerciantess = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set('q', busqueda);
      const res = await fetch(`/api/comerciantes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // El backend devuelve un array plano; preparado también para wrapper { comerciantes, total }
      const list = Array.isArray(data) ? data : (data.comerciantes ?? []);
      setComerciantess(list);
      setTotal(Array.isArray(data) ? list.length : (data.total ?? list.length));
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  }, [token, busqueda]);

  useEffect(() => { fetchComerciantess(); }, [fetchComerciantess]);

  function getIniciales(nombre) {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 animate-fade-in-up">

        {/* ── Header de página ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-[30px] text-ink tracking-[-0.75px] leading-[36px]">
              Mis Comerciantes
            </h1>
            <p className="font-inter font-normal text-[16px] text-muted leading-[24px]">
              Gestión y monitoreo de {total} distribuidores activos en zona.
            </p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-[#9e2016] hover:bg-[#c0392b] text-white font-display font-bold text-[14px] rounded-[8px] px-5 py-3 cursor-pointer transition-colors shrink-0"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M2 13c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M13 3v4M11 5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Nuevo Comerciante
          </button>
        </div>

        {/* ── Buscador ── */}
        <div className="relative max-w-[480px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]" width="16" height="16" fill="none" viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar comerciantes..."
            className="bg-[#f6f3f3] border-none rounded-full pl-9 pr-4 py-2 w-full font-inter text-[14px] text-ink outline-none focus:ring-2 focus:ring-[#9e2016]/20"
          />
        </div>

        {/* ── Grid de cards ── */}
        {cargando ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[16px] h-[200px] animate-pulse border border-[#f5f5f4]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {comerciantes.map(c => (
              <div key={c.id} className="bg-white rounded-[16px] border border-[#f5f5f4] p-5 flex flex-col">
                {/* Badge estado */}
                <div className="flex justify-end mb-2">
                  <span className={`font-inter font-bold text-[11px] uppercase rounded-full px-3 py-1 ${
                    c.activo ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#f5f5f4] text-[#a8a29e]'
                  }`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Foto */}
                {c.fotoUrl ? (
                  <img src={c.fotoUrl} alt={c.nombre}
                    className="w-[64px] h-[64px] rounded-full object-cover" />
                ) : (
                  <div className="w-[64px] h-[64px] rounded-full bg-[#f6f3f3] flex items-center justify-center">
                    <span className="font-display font-bold text-[20px] text-[#9e2016]">
                      {getIniciales(c.nombre)}
                    </span>
                  </div>
                )}

                {/* Info */}
                <p className="font-display font-semibold text-[18px] text-ink mt-3 leading-[24px]">
                  {c.nombre}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                    <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 7.5 6 11 6 11S2.5 7.5 2.5 4.5A3.5 3.5 0 0 1 6 1z" stroke="#9e2016" strokeWidth="1.2"/>
                    <circle cx="6" cy="4.5" r="1" fill="#9e2016"/>
                  </svg>
                  <span className="font-inter font-normal text-[14px] text-muted">{c.municipio}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                    <path d="M2 2.5A.5.5 0 0 1 2.5 2h1.618a.5.5 0 0 1 .447.276l.894 1.789a.5.5 0 0 1-.057.53l-.812 1.015a6.5 6.5 0 0 0 2.8 2.8l1.015-.812a.5.5 0 0 1 .53-.057l1.789.894A.5.5 0 0 1 10.5 8.882V10.5a.5.5 0 0 1-.5.5C4.201 11 1 7.8 1 3.5A.5.5 0 0 1 2 3" stroke="#78716c" strokeWidth="1.1"/>
                  </svg>
                  <span className="font-inter font-normal text-[14px] text-muted">{c.telefono}</span>
                </div>

                {/* Estado diario */}
                <div className="border-t border-[#f5f5f4] mt-3 pt-3 flex items-center justify-between">
                  <span className="font-inter font-semibold text-[10px] uppercase tracking-[0.5px] text-[#a8a29e]">
                    Estado Diario
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${c.activo ? 'bg-[#16a34a]' : 'bg-[#d6d3d1]'}`} />
                </div>
              </div>
            ))}

            {/* Placeholder "Mostrando N registros" */}
            <div className="col-span-full border-2 border-dashed border-[#e7e5e4] rounded-[16px] py-10 flex flex-col items-center justify-center gap-3">
              <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
                <rect x="4" y="4" width="10" height="10" rx="2" fill="#d6d3d1"/>
                <rect x="18" y="4" width="10" height="10" rx="2" fill="#d6d3d1"/>
                <rect x="4" y="18" width="10" height="10" rx="2" fill="#d6d3d1"/>
                <rect x="18" y="18" width="10" height="10" rx="2" fill="#d6d3d1"/>
              </svg>
              <p className="font-inter font-normal text-[14px] text-[#a8a29e]">
                Mostrando {total} registros encontrados en la base de datos...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <NuevoComerciante
          onClose={() => setModalAbierto(false)}
          onSuccess={(msg) => {
            setModalAbierto(false);
            fetchComerciantess();
            if (msg) setToast({ show: true, message: msg });
          }}
        />
      )}

      {/* Toast de éxito */}
      <SuccessToast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: '' })}
      />
    </AppLayout>
  );
}
