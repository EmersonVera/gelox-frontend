import { hayAvisos } from '../../services/avisosPedido';

/** Advertencias de un pedido generado o exportado. No bloquean: el pedido ya quedó creado. */
export default function AvisosPedido({ avisos, className = '' }) {
  if (!hayAvisos(avisos)) return null;
  return (
    <div role="status" className={`rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 flex flex-col gap-1 ${className}`}>
      {avisos.montoMinimo.map((texto) => <p key={texto}>{texto}</p>)}
      {avisos.sinCodigo.length > 0 && (
        <p>
          <strong>Sin código del proveedor:</strong> {avisos.sinCodigo.join(', ')}. Complétalos en Plantillas de exportación.
        </p>
      )}
      {avisos.noUbicados.length > 0 && (
        <p>
          <strong>Sin fila en el archivo del proveedor:</strong> {avisos.noUbicados.join(', ')}. Revisa su código o agrégalos a mano.
        </p>
      )}
    </div>
  );
}
