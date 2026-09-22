import VistaFinanzas from './vistas/VistaFinanzas';
import VistaCierreDia from './vistas/VistaCierreDia';
import VistaPedido from './vistas/VistaPedido';
import VistaModificarPedido from './vistas/VistaModificarPedido';

/**
 * Renderiza la respuesta del asistente según respuesta.intencion.
 * Esqueleto T40-FE5: cada RF agrega su propio case a este switch, sin tocar
 * el default, que solo muestra el texto plano.
 * - CONSULTAR_FINANZAS (T46): VistaCierreDia o VistaFinanzas según datos.tipo.
 * - GENERAR_PEDIDO (T48-FE3, RF52): VistaPedido.
 * - MODIFICAR_PEDIDO (T48-FE6, RF53): VistaModificarPedido.
 */
export default function VistaRespuesta({ respuesta }) {
  if (!respuesta) return null;

  const { intencion, datos, textoRespuesta, comandoId, requiereConfirmacion, expiraEnSegundos, ok } = respuesta;

  switch (intencion) {
    case 'CONSULTAR_FINANZAS':
      return datos?.tipo === 'cierre' ? (
        <VistaCierreDia datos={datos} />
      ) : (
        <VistaFinanzas datos={datos} />
      );
    case 'GENERAR_PEDIDO':
      return (
        <VistaPedido
          comandoId={comandoId}
          datos={datos}
          textoRespuesta={textoRespuesta}
          requiereConfirmacion={requiereConfirmacion}
          expiraEnSegundos={expiraEnSegundos}
        />
      );
    case 'MODIFICAR_PEDIDO':
      return (
        <VistaModificarPedido
          ok={ok ?? true}
          comandoId={comandoId}
          datos={datos}
          textoRespuesta={textoRespuesta}
          requiereConfirmacion={requiereConfirmacion}
          expiraEnSegundos={expiraEnSegundos}
        />
      );
    default:
      return (
        <p className="text-[13px] text-ink leading-snug">
          {textoRespuesta || 'No se pudo interpretar la respuesta.'}
        </p>
      );
  }
}
