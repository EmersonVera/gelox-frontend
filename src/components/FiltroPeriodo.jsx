import { useState } from 'react';

const TIPOS = [
  { value: 'dia',    label: 'Día' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes',    label: 'Mes' },
  { value: 'anio',   label: 'Año' },
  { value: 'rango',  label: 'Rango' },
];

export default function FiltroPeriodo({ onChange, defaultTipo = 'dia' }) {
  const [tipo, setTipo] = useState(defaultTipo);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const handleTipo = (t) => {
    setTipo(t);
    if (t !== 'rango') onChange({ tipo: t });
  };

  const handleRango = (d, h) => {
    if (d && h) onChange({ tipo: 'rango', desde: d, hasta: h });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">

      {/* Pills de tipo */}
      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {TIPOS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleTipo(t.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              tipo === t.value
                ? 'bg-white text-primary shadow-sm font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date pickers — solo para rango */}
      {tipo === 'rango' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => { setDesde(e.target.value); handleRango(e.target.value, hasta); }}
            className="bg-surface border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1.5 text-sm text-ink outline-none transition-all duration-200"
          />
          <span className="text-muted text-sm">→</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => { setHasta(e.target.value); handleRango(desde, e.target.value); }}
            className="bg-surface border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-1.5 text-sm text-ink outline-none transition-all duration-200"
          />
        </div>
      )}

    </div>
  );
}
