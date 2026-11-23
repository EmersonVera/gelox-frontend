// src/components/plataforma/ConsumoPlan.jsx — RF70: uso de cada cuota del plan de una distribuidora
import { AlertIcon, IconoCuota } from './IconosPlataforma';
import { CUOTAS, UMBRAL_CUOTA, colorUso, porcentajeUso, textoUso } from './plataformaUtils';

const NOMBRE_EN_FRASE = {
  usuarios: 'usuarios', productos: 'productos', comerciantes: 'comerciantes',
  almacenamientoMb: 'almacenamiento', llamadasIaMes: 'llamadas IA',
};

function unir(lista) {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * uso: distribuidora.uso = { usuarios: { usado, limite }, productos, comerciantes, almacenamientoMb, llamadasIaMes }.
 * plan: nombre del plan, para el aviso.
 */
export default function ConsumoPlan({ uso, plan }) {
  const filas = CUOTAS.map((c) => ({ c, u: uso?.[c.uso], pct: porcentajeUso(uso?.[c.uso]) })).filter((f) => f.u);
  const llenas = filas.filter((f) => f.pct !== null && f.pct >= 100).map((f) => NOMBRE_EN_FRASE[f.c.uso]);
  const cerca = filas.filter((f) => f.pct !== null && f.pct >= UMBRAL_CUOTA && f.pct < 100).map((f) => NOMBRE_EN_FRASE[f.c.uso]);
  const mes = MESES[new Date().getMonth()];

  return (
    <div>
      {filas.map(({ c, u, pct }) => (
        <div key={c.uso} className="mb-3.5">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="flex items-center gap-2 text-[13px] text-faint">
              <IconoCuota uso={c.uso} />
              {c.uso === 'llamadasIaMes' ? `Llamadas IA (${mes})` : c.label}
            </span>
            <span className="text-[13px] text-right">
              <strong className="font-semibold text-ink">{textoUso(u, c.mb)}</strong>
              {pct !== null && <span className="text-muted"> · {pct} %</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${pct === null ? 'bg-divider' : colorUso(pct)}`}
              style={{ width: `${pct === null ? 0 : Math.min(100, pct)}%` }}
            />
          </div>
        </div>
      ))}

      {(llenas.length > 0 || cerca.length > 0) && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-[13px] leading-relaxed mt-1 ${
          llenas.length ? 'bg-error-bg border border-[#ffb4a9] text-error-fg' : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}>
          <span className="shrink-0 mt-0.5"><AlertIcon /></span>
          <p>
            {llenas.length > 0 && (
              <>
                {unir(llenas).charAt(0).toUpperCase() + unir(llenas).slice(1)} {llenas.length === 1 ? 'llegó' : 'llegaron'} al 100 % del plan {plan}:
                la distribuidora recibe «Cuota del plan alcanzada» al crear registros de ese tipo.{' '}
              </>
            )}
            {cerca.length > 0 && (
              <>
                {unir(cerca).charAt(0).toUpperCase() + unir(cerca).slice(1)} {cerca.length === 1 ? 'está' : 'están'} en {UMBRAL_CUOTA} % o más del plan {plan}.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
