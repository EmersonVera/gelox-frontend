// src/components/inventarios/CantidadControl.jsx
// Componente reutilizable para controles de cantidad (cajas / unidades)
export default function CantidadControl({ label, value, onMinus, onPlus }) {
  return (
    <div className="flex items-center justify-between bg-[#f6f3f3] rounded-[8px] px-3 py-1.5">
      <span className="font-['Inter'] font-medium text-[13px] text-[#57534e]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onMinus}
          className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center font-bold text-[#57534e] hover:bg-[#e7e5e4] cursor-pointer transition-colors"
        >
          −
        </button>
        <span className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c] w-5 text-center">
          {value}
        </span>
        <button
          onClick={onPlus}
          className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center font-bold text-[#9e2016] hover:bg-[#fef2f2] cursor-pointer transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
