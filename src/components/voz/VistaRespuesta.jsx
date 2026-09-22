import VistaFinanzas from './vistas/VistaFinanzas';
import VistaCierreDia from './vistas/VistaCierreDia';

/**
 * Renderiza la respuesta del asistente según respuesta.intencion.
 * Esqueleto T40-FE5: cada RF agrega su propio case a este switch, sin tocar
 * el default, que solo muestra el texto plano.
 * - CONSULTAR_FINANZAS (T46): VistaCierreDia o VistaFinanzas según datos.tipo.
 */
export default function VistaRespuesta({ respuesta }) {
  if (!respuesta) return null;

  const { intencion, datos, textoRespuesta } = respuesta;

  switch (intencion) {
    case 'CONSULTAR_FINANZAS':
      return datos?.tipo === 'cierre' ? (
        <VistaCierreDia datos={datos} />
      ) : (
        <VistaFinanzas datos={datos} />
      );
    default:
      return (
        <p className="text-[13px] text-ink leading-snug">
          {textoRespuesta || 'No se pudo interpretar la respuesta.'}
        </p>
      );
  }
}
