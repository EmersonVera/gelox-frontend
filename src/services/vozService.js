import api from "../api/axiosConfig";

// NOTA T48: este archivo no existía todavía en la rama. Se crea aquí con lo
// mínimo que pide T48-FE2; cualquier otra función de voz (interpretar,
// confirmar, etc.) la agregan Zharick/Angie según sus propias tareas.

function nombreDesdeContentDisposition(headerValue, fallback) {
  if (!headerValue) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(headerValue);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Descarga el Excel de un pedido a proveedor generado por voz (RF52/RF53).
 * GET /api/inventario/pedidos/{id}/exportar (T47-BE4). Mismo patrón de blob
 * que pages/inventarios/GenerarPedido.jsx (líneas ~125-126), sin tocar ese archivo.
 */
export async function descargarExportacionPedido(exportUrl) {
  const respuesta = await api.get(exportUrl, { responseType: "blob" });
  const nombre = nombreDesdeContentDisposition(
    respuesta.headers["content-disposition"],
    "pedido.xlsx"
  );
  const url = URL.createObjectURL(respuesta.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
