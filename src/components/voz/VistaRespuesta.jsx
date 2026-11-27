import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VistaFinanzas from './vistas/VistaFinanzas';
import VistaCierreDia from './vistas/VistaCierreDia';
import VistaPedido from './vistas/VistaPedido';
import VistaModificarPedido from './vistas/VistaModificarPedido';
import VistaVenta from './vistas/VistaVenta';
import VistaInventario from './vistas/VistaInventario';
import VistaRecomendacion from './vistas/VistaRecomendacion';
import VistaElegirRecomendacion from './vistas/VistaElegirRecomendacion';

function VistaNavegacion({ datos, textoRespuesta }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (datos?.ruta) {
      const timer = setTimeout(() => {
        navigate(datos.ruta);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [datos?.ruta, navigate]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-surface rounded-xl border border-border">
      <div className="flex items-center gap-2 text-primary font-semibold text-xs">
        <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <span>{textoRespuesta || `Navegando a ${datos?.pantalla || 'pantalla'}...`}</span>
      </div>
      {datos?.ruta && (
        <button
          type="button"
          onClick={() => navigate(datos.ruta)}
          className="text-[11px] text-muted hover:text-primary transition-colors text-left font-medium"
        >
          Si no redirige automáticamente, haz clic aquí →
        </button>
      )}
    </div>
  );
}

/**
 * Renderiza la respuesta del asistente según respuesta.intencion.
 * Esqueleto T40-FE5: cada RF agrega su propio case a este switch, sin tocar
 * el default, que solo muestra el texto plano.
 * - CONSULTAR_FINANZAS (T46): VistaCierreDia o VistaFinanzas según datos.tipo.
 * - GENERAR_PEDIDO (T48-FE3, RF52): VistaPedido.
 * - MODIFICAR_PEDIDO (T48-FE6, RF53): VistaModificarPedido.
 * - CONSULTAR_RECOMENDACION / DECIDIR_RECOMENDACION (RF55): VistaRecomendacion.
 * - NAVEGACION: redirige dinámicamente a la pestaña solicitada por voz.
 *
 * respuesta.aviso (RF70, POST /api/voz/interpretar): texto o null, p. ej. la cuota de IA del plan
 * agotada. Se muestra arriba de cualquier tipo de respuesta.
 */
export default function VistaRespuesta(props) {
  if (!props.respuesta) return null;
  const { aviso } = props.respuesta;
  if (!aviso) return <ContenidoRespuesta {...props} />;
  return (
    <div className="flex flex-col gap-2">
      <div role="status" className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#fffbeb] border border-[#fcd34d] text-[12px] text-[#92400e] leading-snug">
        <svg width="14" height="14" className="shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        <span>{aviso}</span>
      </div>
      <ContenidoRespuesta {...props} />
    </div>
  );
}

function ContenidoRespuesta({ respuesta, onConfirmar, onCancelar, onResponder }) {

  const { intencion, datos, textoRespuesta, requiereConfirmacion, expiraEnSegundos, ok } = respuesta;

  // "¿Cuál de las recomendaciones del día?": tarjetas, sin importar la intención (aprobar, ver…).
  if (datos?.tipoPregunta === 'ELEGIR_RECOMENDACION' && Array.isArray(datos.opciones)) {
    return <VistaElegirRecomendacion datos={datos} onElegir={onResponder} />;
  }

  switch (intencion) {
    case 'NAVEGACION':
      return <VistaNavegacion datos={datos} textoRespuesta={textoRespuesta} />;
    case 'CONSULTAR_FINANZAS':
      // Baja confianza: mismo "Entendí… ¿Confirmas?" con botones que la consulta de inventario.
      if (requiereConfirmacion) {
        return <VistaInventario respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
      }
      return datos?.tipo === 'cierre' ? (
        <VistaCierreDia datos={datos} />
      ) : (
        <VistaFinanzas datos={datos} />
      );
    case 'REGISTRAR_VENTA':
      return <VistaVenta respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
    case 'CONSULTAR_INVENTARIO':
      return <VistaInventario respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
    case 'GENERAR_PEDIDO':
      return <VistaPedido respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
    case 'MODIFICAR_PEDIDO':
      return (
        <VistaModificarPedido
          ok={ok ?? true}
          datos={datos}
          textoRespuesta={textoRespuesta}
          requiereConfirmacion={requiereConfirmacion}
          expiraEnSegundos={expiraEnSegundos}
          cancelado={respuesta.cancelado}
          onConfirmar={onConfirmar}
          onCancelar={onCancelar}
        />
      );
    case 'CONSULTAR_RECOMENDACION':
      // Baja confianza: la consulta pide confirmación igual que inventario y finanzas.
      if (requiereConfirmacion) {
        return <VistaInventario respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
      }
      return <VistaRecomendacion respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
    case 'DECIDIR_RECOMENDACION':
      return <VistaRecomendacion respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
    case 'CONSULTAR_GENERAL':
      // "¿Cuántas recomendaciones / clientes…?": texto; con baja confianza, confirmar como las demás consultas.
      if (requiereConfirmacion) {
        return <VistaInventario respuesta={respuesta} onConfirmar={onConfirmar} onCancelar={onCancelar} />;
      }
      return <p className="text-[13px] text-ink leading-snug">{textoRespuesta}</p>;
    default:
      return (
        <p className="text-[13px] text-ink leading-snug">
          {textoRespuesta || 'No se pudo interpretar la respuesta.'}
        </p>
      );
  }
}
