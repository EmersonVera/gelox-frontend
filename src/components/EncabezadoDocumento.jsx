import LogoDistribuidora from './LogoDistribuidora';
import { esHexValido } from '../context/identidadUtils';

/**
 * Encabezado de los documentos que se imprimen desde el navegador (RF60):
 * logotipo, nombre comercial y una línea en el color primario.
 *
 * Props:
 *   identidad — { nombreComercial, logoUrl, colorPrimario } (PlanillaImpresionResponseDTO.identidad)
 *   subtitulo — texto bajo el nombre, p. ej. 'Planilla diaria · 17/10/2026'
 *   detalle   — texto alineado a la derecha, p. ej. 'Comerciante: Juan Pérez'
 */
export default function EncabezadoDocumento({ identidad, subtitulo, detalle, className = '' }) {
  const color = esHexValido(identidad?.colorPrimario) ? identidad.colorPrimario : undefined;
  const nombre = identidad?.nombreComercial || 'GELOX';

  return (
    <div
      className={`flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 print:flex-row print:items-center print:justify-between pb-3 border-b-2 border-primary [print-color-adjust:exact] ${className}`}
      style={color ? { borderColor: color } : undefined}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <LogoDistribuidora
          nombre={nombre}
          logoUrl={identidad?.logoUrl}
          color={color}
          className="w-10 h-10 rounded-[10px] text-[14px]"
        />
        <div className="min-w-0">
          <p
            className="font-display font-extrabold text-[18px] leading-tight text-primary truncate"
            style={color ? { color } : undefined}
          >
            {nombre}
          </p>
          {subtitulo && <p className="font-sans text-[12px] text-muted mt-0.5">{subtitulo}</p>}
        </div>
      </div>
      {detalle && <p className="font-sans text-[12px] text-muted sm:text-right sm:max-w-[45%]">{detalle}</p>}
    </div>
  );
}
