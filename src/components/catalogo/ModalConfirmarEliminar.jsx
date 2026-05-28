// src/components/catalogo/ModalConfirmarEliminar.jsx
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ModalConfirmarEliminar({ producto, onClose, onSuccess }) {
  const { token } = useAuth();
  const [eliminando, setEliminando] = useState(false);
  const [error, setError]           = useState('');
  const [isClosing, setIsClosing]   = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => { setIsClosing(false); onClose(); }, 200);
  };

  const handleEliminar = async () => {
    setEliminando(true);
    setError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${base}/api/catalogo/productos/${producto.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.mensaje ?? errData.message ?? '';
        if (res.status === 409) throw new Error(msg || 'No se puede eliminar el producto porque está siendo usado en registros existentes.');
        if (res.status >= 500)  throw new Error('Error en el servidor al eliminar. Intenta más tarde.');
        throw new Error(msg || 'No se pudo eliminar el producto.');
      }
      onSuccess('Producto eliminado correctamente.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-[400px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-8 flex flex-col gap-6 ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">¿Eliminar producto?</h3>
          <p className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
            Vas a eliminar <strong className="text-[#1b1b1c]">{producto.nombre}</strong>. Esta acción no se puede deshacer.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] text-sm flex items-start gap-2">
            <svg width="15" height="15" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 border border-[#e7e5e4] rounded-[8px] py-3 font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:bg-[#f6f3f3] cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={eliminando}
            className="flex-1 flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] rounded-[8px] py-3 cursor-pointer transition-colors"
          >
            {eliminando ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />Eliminando...</>
            ) : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
