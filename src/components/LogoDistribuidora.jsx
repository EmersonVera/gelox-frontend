import { useState } from 'react';
import { iniciales } from '../context/identidadUtils';

/**
 * Logotipo de la distribuidora; sin logotipo (o si la imagen no carga) muestra
 * las iniciales del nombre comercial sobre el color primario.
 *
 * Props:
 *   nombre    — nombre comercial (para iniciales y texto alternativo)
 *   logoUrl   — URL del logotipo o null
 *   color     — color de fondo de las iniciales (por defecto el token primary)
 *   className — tamaño, forma y tamaño de letra, p. ej. 'w-10 h-10 rounded-full text-[14px]'
 */
export default function LogoDistribuidora({ nombre, logoUrl, color, className = 'w-10 h-10 rounded-full text-[14px]' }) {
  const [urlFallida, setUrlFallida] = useState(null);

  if (logoUrl && urlFallida !== logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nombre ? `Logotipo de ${nombre}` : 'Logotipo'}
        className={`${className} object-contain shrink-0 bg-white`}
        onError={() => setUrlFallida(logoUrl)}
      />
    );
  }

  return (
    <span
      className={`${className} ${color ? '' : 'bg-primary'} shrink-0 inline-flex items-center justify-center text-white font-display font-extrabold leading-none select-none [print-color-adjust:exact]`}
      style={color ? { backgroundColor: color } : undefined}
      aria-label={nombre}
    >
      {iniciales(nombre)}
    </span>
  );
}
