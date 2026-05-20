import { useState } from 'react';
import api from '../api/axiosConfig';

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

const parseMonto = (v) => parseFloat(String(v).trim()) || 0;

const CANALES = [
  { key: 'ventanilla',    label: 'Ventanilla' },
  { key: 'rural',         label: 'Rural' },
  { key: 'comerciantes',  label: 'Comerciantes' },
];

export default function CierreCaja({ efectivoEsperado = 0 }) {
  const [montos, setMontos] = useState({ ventanilla: '', rural: '', comerciantes: '' });
  const [procesando, setProcesando] = useState(false);
  const [error, setError]           = useState('');
  const [exitoso, setExitoso]       = useState(false);

  const totalFisico = CANALES.reduce((sum, c) => sum + parseMonto(montos[c.key]), 0);
  const diferencia  = totalFisico - efectivoEsperado;
  const todosLlenos = CANALES.every((c) => montos[c.key] !== '');

  const handleChange = (key, value) => {
    setExitoso(false);
    setError('');
    setMontos((prev) => ({ ...prev, [key]: value }));
  };

  const handleProcesar = async () => {
    setError('');
    setProcesando(true);
    try {
      await api.post('/api/cierre-caja', {
        montoFisicoVentanilla:   parseMonto(montos.ventanilla),
        montoFisicoRural:        parseMonto(montos.rural),
        montoFisicoComerciantes: parseMonto(montos.comerciantes),
      });
      setExitoso(true);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.message ?? 'Error al registrar el cierre.';
      setError(msg);
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

      {/* Efectivo esperado total — solo lectura */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Total Esperado (sistema)
        </label>
        <div className="border border-border rounded-xl px-4 py-2.5 text-sm text-ink bg-surface">
          {fmt(efectivoEsperado)}
        </div>
      </div>

      {/* Inputs por canal */}
      {CANALES.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Efectivo Físico — {label}
          </label>
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200">
            <span className="pl-4 text-primary font-bold text-sm">$</span>
            <input
              type="number"
              min="0"
              value={montos[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="flex-1 px-2 py-2.5 text-sm text-ink outline-none bg-transparent placeholder:text-muted"
              placeholder="0"
            />
          </div>
        </div>
      ))}

      {/* Total físico ingresado */}
      <div className="flex justify-between items-center text-sm px-1">
        <span className="text-muted font-medium">Total físico ingresado</span>
        <span className="font-bold text-ink">{todosLlenos ? fmt(totalFisico) : '—'}</span>
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
          {!todosLlenos ? '$0' : fmt(diferencia)}
        </span>
      </div>

      {/* Mensajes */}
      {error && <p className="text-sm text-danger">{error}</p>}
      {exitoso && (
        <p className="text-sm text-green-700 font-medium">
          ✓ Cierre de caja registrado correctamente.
        </p>
      )}

      {/* Botón */}
      <button
        type="button"
        onClick={handleProcesar}
        disabled={procesando || !todosLlenos || exitoso}
        className="w-full bg-ink hover:bg-zinc-800 text-white rounded-xl py-2.5 text-sm font-semibold font-display transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {procesando ? 'Procesando…' : exitoso ? 'Cierre Registrado' : 'Procesar Cierre de Caja'}
      </button>

    </div>
  );
}
