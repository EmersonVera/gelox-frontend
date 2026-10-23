import { ESTADOS_DISTRIBUIDORA } from './plataformaUtils';

/** Insignia del estado del ciclo de vida de una distribuidora (RF59). */
export default function EstadoBadge({ estado, className = '' }) {
  const e = ESTADOS_DISTRIBUIDORA[estado];
  if (!e) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${e.badge} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.dot}`} />
      {e.label}
    </span>
  );
}
