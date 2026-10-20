import { createPortal } from 'react-dom';
import { formatoCOP } from '../../voz/formato';

/**
 * Confirmación antes de convertir la recomendación en pedido a proveedor (RF56).
 * Se monta en document.body: el contenedor de AppLayout tiene una animación con
 * transform, y dentro de él un "fixed" quedaría pegado al contenido y no a la ventana.
 */
export default function ModalConfirmarPedido({ abierto, aprobados, cajas, costo, pendientes, enviando, onConfirmar, onCerrar }) {
  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={enviando ? undefined : onCerrar} />
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar-pedido"
        className="relative bg-white rounded-[16px] shadow-xl w-full max-w-md p-6 flex flex-col gap-4 animate-fade-in-up">
        <h2 id="titulo-confirmar-pedido" className="font-['Manrope'] font-bold text-[20px] text-[#1b1b1c]">
          ¿Generar el pedido a proveedor?
        </h2>
        <p className="font-['Inter'] text-[14px] text-[#57534e]">
          Se creará un pedido en estado Pendiente con los productos aprobados o modificados.
        </p>
        <dl className="bg-[#f6f3f3] rounded-[12px] p-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="font-['Inter'] text-[11px] uppercase tracking-[0.5px] text-[#78716c]">Productos</dt>
            <dd className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">{aprobados}</dd>
          </div>
          <div>
            <dt className="font-['Inter'] text-[11px] uppercase tracking-[0.5px] text-[#78716c]">Cajas</dt>
            <dd className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">{cajas}</dd>
          </div>
          <div>
            <dt className="font-['Inter'] text-[11px] uppercase tracking-[0.5px] text-[#78716c]">Costo</dt>
            <dd className="font-['Manrope'] font-bold text-[18px] text-[#1b1b1c]">{formatoCOP(costo)}</dd>
          </div>
        </dl>
        {pendientes > 0 && (
          <p className="font-['Inter'] text-[13px] text-[#92400e] bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] px-3 py-2">
            {pendientes} producto(s) siguen pendientes de decisión y no se incluirán en el pedido.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} disabled={enviando}
            className="px-4 py-2.5 rounded-[10px] font-['Inter'] font-semibold text-[14px] text-[#57534e] hover:bg-[#f5f5f4] transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} disabled={enviando}
            className="px-4 py-2.5 rounded-[10px] font-['Inter'] font-semibold text-[14px] text-white bg-[#9e2016] hover:bg-[#7f1a12] transition-colors disabled:opacity-60">
            {enviando ? 'Generando…' : 'Generar pedido'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
