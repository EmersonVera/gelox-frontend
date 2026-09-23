import { useEffect, useRef, useState } from 'react';
import { useAsistenteVoz } from '../../hooks/useAsistenteVoz';
import { useAuth } from '../../context/AuthContext';
import { getAlertasStock } from '../../services/inventarioService';
import BotonMicrofono from './BotonMicrofono';
import PanelAsistenteVoz from './PanelAsistenteVoz';

// T44-FE2 — roles que pueden ver /api/inventario/alertas (mismo set que
// puedeVerAlertas en Navbar.jsx para la campana).
const ROLES_ALERTA_STOCK = ['ADMINISTRADOR', 'ENCARGADO_INVENTARIO'];
const ALERTAS_SESSION_KEY = 'gelox_voz_alertas';

/**
 * Junta el hook useAsistenteVoz con el botón de micrófono y el panel.
 * Se muestra en el Navbar para todos los roles (RF46).
 */
export default function AsistenteVoz() {
  const {
    soportado,
    permisoDenegado,
    estado,
    transcripcionParcial,
    textoFinal,
    respuesta,
    iniciar,
    cancelar,
    confirmar,
    hablar,
  } = useAsistenteVoz();
  const { rol } = useAuth();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // T44-FE2 — alerta proactiva de stock bajo mínimo, una sola vez por sesión
  // de pestaña, la primera vez que se abre el panel (no al montar el
  // Navbar), y solo para los roles que realmente pueden actuar sobre eso.
  useEffect(() => {
    if (!open) return;
    if (sessionStorage.getItem(ALERTAS_SESSION_KEY)) return;
    if (!ROLES_ALERTA_STOCK.includes(rol)) return;

    sessionStorage.setItem(ALERTAS_SESSION_KEY, '1');
    getAlertasStock()
      .then((alertas) => {
        const lista = Array.isArray(alertas) ? alertas : [];
        if (lista.length === 0) return;
        const nombres = lista.map((a) => a.nombre).join(', ');
        hablar(`Atención: ${lista.length} ${lista.length === 1 ? 'producto' : 'productos'} por debajo del mínimo: ${nombres}`);
      })
      .catch(() => {
        // Silencioso: una alerta proactiva que falla no debe interrumpir ni
        // bloquear el resto del asistente (mismo criterio que AlertasBell).
      });
  }, [open, rol, hablar]);

  // Cierra al hacer clic afuera — mismo patrón que AlertasBell en Navbar.jsx.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) {
        cancelar();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, cancelar]);

  const handleClickBoton = () => {
    if (open) {
      cancelar();
      setOpen(false);
    } else {
      setOpen(true);
      iniciar();
    }
  };

  const handleCancelar = () => {
    cancelar();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <BotonMicrofono
        open={open}
        estado={estado}
        soportado={soportado}
        permisoDenegado={permisoDenegado}
        onClick={handleClickBoton}
      />
      {open && (
        <PanelAsistenteVoz
          estado={estado}
          transcripcionParcial={transcripcionParcial}
          textoFinal={textoFinal}
          respuesta={respuesta}
          permisoDenegado={permisoDenegado}
          onCancelar={handleCancelar}
          onConfirmarPendiente={() => confirmar(true)}
          onCancelarPendiente={() => confirmar(false)}
        />
      )}
    </div>
  );
}
