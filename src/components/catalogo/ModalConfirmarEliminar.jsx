// src/components/catalogo/ModalConfirmarEliminar.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ModalConfirmarEliminar({ producto, onClose, onSuccess }) {
  const { token } = useAuth();
  const [eliminando, setEliminando] = useState(false);
  const [error, setError]           = useState('');

  const handleEliminar = async () => {
    setEliminando(true);
    setError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? '';
      const res = await fetch(`${base}/api/catalogo/productos/${producto.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo eliminar el producto.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] w-[400px] p-8 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">¿Eliminar producto?</h3>
          <p className="font-['Inter'] font-normal text-[14px] text-[#78716c]">
            Vas a eliminar <strong className="text-[#1b1b1c]">{producto.nombre}</strong>. Esta acción no se puede deshacer.
          </p>
        </div>

        {error && <p className="font-['Inter'] text-[12px] text-[#dc2626] text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-[#e7e5e4] rounded-[8px] py-3 font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:bg-[#f6f3f3] cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={eliminando}
            className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-70 text-white font-['Manrope'] font-bold text-[14px] rounded-[8px] py-3 cursor-pointer transition-colors"
          >
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
