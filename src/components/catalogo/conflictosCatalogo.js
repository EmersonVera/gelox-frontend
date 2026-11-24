// 409 al crear o editar un producto del catálogo: cuota del plan agotada o SKU repetido.
//
// PROVISIONAL: reemplazar por el helper de Israel (#193) cuando esté en el repo y borrar
// este archivo. NuevoProducto y EditarProducto solo usan interpretarConflicto, así que
// el cambio es en el import.
//
// Cuerpo esperado del backend: { error, codigo?: 'CUOTA_PRODUCTOS' | 'SKU_DUPLICADO', campo?, limite? }.
// Si no llega el código, se decide por el texto del mensaje.

function mensajeDe(err) {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  return data?.error ?? data?.mensaje ?? data?.message ?? '';
}

/**
 * Devuelve null si el error no es un 409; si lo es:
 *   { tipo: 'CUOTA' | 'SKU' | 'OTRO', mensaje, campo }
 */
export function interpretarConflicto(err) {
  if (err?.response?.status !== 409) return null;
  const data = err.response.data ?? {};
  const codigo = String(data.codigo ?? '').toUpperCase();
  const texto = mensajeDe(err);

  if (codigo.includes('CUOTA') || codigo.includes('LIMITE') || /cuota|l[ií]mite|plan/i.test(texto)) {
    const limite = data.limite != null ? ` de ${data.limite} productos` : '';
    return {
      tipo: 'CUOTA',
      campo: null,
      mensaje: texto || `Alcanzaste el límite${limite} de tu plan. Desactiva productos que no uses o mejora tu plan para agregar más.`,
    };
  }
  if (codigo.includes('SKU') || data.campo === 'sku' || data.campo === 'codigoTecnico' || /sku|c[oó]digo/i.test(texto)) {
    return {
      tipo: 'SKU',
      campo: 'sku',
      mensaje: texto || 'Ya existe un producto con este SKU en tu distribuidora.',
    };
  }
  return { tipo: 'OTRO', campo: null, mensaje: texto || 'El producto entra en conflicto con otro registro.' };
}
