/**
 * Renderiza la respuesta del asistente según respuesta.intencion.
 * Esqueleto T40-FE5: cada RF agrega su propio case a este switch
 * (ver T46) sin tocar el default, que solo muestra el texto plano.
 */
export default function VistaRespuesta({ respuesta }) {
  if (!respuesta) return null;

  switch (respuesta.intencion) {
    default:
      return <p className="text-[13px] text-ink leading-snug">{respuesta.textoRespuesta}</p>;
  }
}
