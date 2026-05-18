import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function CajaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7l1-4h18l1 4" />
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 12H8" />
      <path d="M12 12v4" />
    </svg>
  );
}

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n));

export default function CierreCaja({ efectivoEsperado = 0 }) {
  const { token } = useAuth();
  const [efectivoFisico, setEfectivoFisico] = useState('');
  const [procesando, setProcesando]         = useState(false);
  const [error, setError]                   = useState('');

  const efectivoNum = parseFloat(String(efectivoFisico).replace(/\D/g, '')) || 0;
  const diferencia  = efectivoNum - efectivoEsperado;

  const handleProcesar = async () => {
    setError('');
    setProcesando(true);
    try {
      const res = await fetch('/api/cierre-caja', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ montoFisico: efectivoNum }),
      });
      if (!res.ok) throw new Error('Error al registrar el cierre.');
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">

      {/* Icono + título */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <CajaIcon />
        </div>
        <div>
          <h2 className="font-display font-bold text-sm text-ink leading-tight">
            Cierre de Caja Diario
          </h2>
          <p className="text-xs text-muted leading-snug mt-0.5">
            Reconciliación de efectivo al cierre del día.
          </p>
        </div>
      </div>

      {/* Efectivo esperado — solo lectura */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Efectivo Esperado
        </label>
        <div className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink bg-surface">
          {fmt(efectivoEsperado)}
        </div>
      </div>

      {/* Efectivo real en caja */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Efectivo Real en Caja
        </label>
        <div className="flex items-center border border-border rounded-xl overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
          <span className="pl-4 text-primary font-bold text-sm">$</span>
          <input
            type="number"
            min="0"
            value={efectivoFisico}
            onChange={(e) => setEfectivoFisico(e.target.value)}
            className="flex-1 px-2 py-2.5 text-sm text-ink outline-none bg-transparent placeholder:text-muted"
            placeholder="0"
          />
        </div>
      </div>

      {/* Diferencia */}
      <div className={`rounded-xl px-4 py-2.5 text-sm font-medium border transition-colors ${
        diferencia === 0
          ? 'bg-surface border-border text-muted'
          : diferencia > 0
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-error-bg border-danger/20 text-error-fg'
      }`}>
        Diferencia (Sobrante/Faltante):{' '}
        <span className="font-bold">
          {efectivoFisico === '' ? '$0' : fmt(diferencia)}
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {/* Botón */}
      <button
        type="button"
        onClick={handleProcesar}
        disabled={procesando || !efectivoFisico}
        className="w-full bg-ink hover:bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-semibold font-display transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {procesando ? 'Procesando…' : 'Procesar Cierre de Caja'}
      </button>

    </div>
  );
}
