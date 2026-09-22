import { useEffect, useRef, useState } from 'react';
import { useAsistenteVoz } from '../../hooks/useAsistenteVoz';
import BotonMicrofono from './BotonMicrofono';
import PanelAsistenteVoz from './PanelAsistenteVoz';

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
  } = useAsistenteVoz();

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
          onConfirmarVenta={() => confirmar(true)}
          onCancelarVenta={() => confirmar(false)}
        />
      )}
    </div>
  );
}
