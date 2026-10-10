import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Lo que el asistente de voz manda al abrir una pantalla ("Editar en …", va en
 * location.state[clave]). Devuelve los datos solo en el render en que hay que aplicarlos
 * (cuando `listo`), también si ya estabas en esa pantalla y no se vuelve a montar.
 * Después limpia el historial para que recargar la página no los repita.
 */
export default function useDatosVoz(clave, listo) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const datos = state?.[clave] ?? null;
  const [aplicados, setAplicados] = useState(null);

  const nuevos = !!(listo && datos && datos !== aplicados);
  if (nuevos) setAplicados(datos);

  useEffect(() => {
    if (aplicados && datos === aplicados) navigate('.', { replace: true, state: null });
  }, [aplicados, datos, navigate]);

  return nuevos ? datos : null;
}
