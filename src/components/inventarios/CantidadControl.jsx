// src/components/inventarios/CantidadControl.jsx
// Componente reutilizable para controles de cantidad (cajas / unidades)
export default function CantidadControl({ label, value, onMinus, onPlus, onChange, hasError }) {
  return (
    <div className={`flex items-center justify-between rounded-[8px] px-3 py-1.5 ${hasError ? 'bg-red-50 ring-1 ring-red-300' : 'bg-[#f6f3f3]'}`}>
      <span className="font-['Inter'] font-medium text-[13px] text-[#57534e]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMinus}
          className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center font-bold text-[#57534e] hover:bg-[#e7e5e4] cursor-pointer transition-colors"
        >
          −
        </button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => {
            if (!onChange) return;
            const n = parseInt(e.target.value, 10);
            onChange(isNaN(n) || n < 0 ? 0 : n);
          }}
          readOnly={!onChange}
          className="font-['Manrope'] font-bold text-[14px] text-[#1b1b1c] w-9 text-center bg-white border border-[#e7e5e4] rounded-[6px] py-0.5 outline-none focus:border-[#9e2016] focus:ring-1 focus:ring-[#9e2016]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={onPlus}
          className="w-7 h-7 bg-white rounded-[6px] flex items-center justify-center font-bold text-[#9e2016] hover:bg-[#fef2f2] cursor-pointer transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
