import VistaFinanzas from "./vistas/VistaFinanzas";
import VistaCierreDia from "./vistas/VistaCierreDia";

// NOTA T46: este archivo no existía todavía en la rama (no se encontró ni el
// esqueleto ni el `default case` de Angie / T40-FE5). Se crea aquí con lo
// mínimo necesario para T46 (el `case "CONSULTAR_FINANZAS"` y un `default`
// de resguardo). Angie debe revisar/completar este archivo con el resto de
// intenciones de su T40 y T42 — no reescribir lo de aquí, solo agregar.
export default function VistaRespuesta({ respuesta }) {
  if (!respuesta) return null;

  const { intencion, datos, textoRespuesta } = respuesta;

  switch (intencion) {
    case "CONSULTAR_FINANZAS":
      return datos?.tipo === "cierre" ? (
        <VistaCierreDia datos={datos} />
      ) : (
        <VistaFinanzas datos={datos} />
      );
    default:
      return (
        <p className="text-sm text-muted">
          {textoRespuesta || "No se pudo interpretar la respuesta."}
        </p>
      );
  }
}
