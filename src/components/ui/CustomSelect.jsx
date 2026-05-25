/**
 * CustomSelect — dropdown completamente custom (reemplaza <select> nativo)
 *
 * Props:
 *   value       string                        — valor seleccionado
 *   onChange    (value: string) => void       — callback
 *   options     Array<{ value, label }|string> — opciones
 *   placeholder string                        — texto vacío
 *   className   string                        — clases extra en el wrapper
 *   disabled    boolean
 *   searchable  boolean                       — agrega buscador en el panel
 *   size        'md' | 'sm'                   — tamaño del trigger (md=py-3, sm=py-2.5)
 */
import { createPortal } from 'react-dom';
import { useState, useRef, useEffect, useCallback } from 'react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
  searchable = false,
  size = 'md',
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropRef    = useRef(null);
  const searchRef  = useRef(null);

  /* ── Normalizar opciones a { value, label } ── */
  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const filtered = query
    ? normalized.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : normalized;
  const selected = normalized.find(o => o.value === value);

  /* ── Abrir / posicionar ── */
  const openDropdown = useCallback(() => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Detectar si hay espacio debajo, si no abrir arriba
    const estHeight = Math.min(filtered.length * 44 + (searchable ? 52 : 12) + 12, 260);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove  = spaceBelow < estHeight + 8 && rect.top > estHeight;

    setPos({
      top:   openAbove ? undefined : rect.bottom + 6,
      bottom: openAbove ? window.innerHeight - rect.top + 6 : undefined,
      left:  rect.left,
      width: rect.width,
    });
    setQuery('');
    setOpen(v => !v);
  }, [disabled, filtered.length, searchable]);

  /* ── Cerrar al click fuera o scroll ── */
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!triggerRef.current?.contains(e.target) && !dropRef.current?.contains(e.target))
        setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  /* ── Auto-focus del buscador ── */
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open, searchable]);

  const pick = (val) => { onChange(val); setOpen(false); setQuery(''); };

  const py = size === 'sm' ? 'py-2.5' : 'py-3';

  return (
    <>
      {/* ── Trigger ── */}
      <div ref={triggerRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={openDropdown}
          disabled={disabled}
          className={[
            `w-full bg-[#f6f3f3] rounded-[8px] px-4 ${py}`,
            "text-left font-['Inter'] text-[14px] leading-[1.25]",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#9e2016]/30",
            "flex items-center justify-between gap-2",
            "transition-colors duration-150 select-none",
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-[#ede9e9]",
            selected ? "text-[#1b1b1c]" : "text-[#a8a29e]",
          ].filter(Boolean).join(' ')}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <svg
            className={`shrink-0 text-[#a8a29e] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Panel dropdown — portaled para evitar clipping por overflow ── */}
      {open && createPortal(
        <div
          ref={dropRef}
          style={{
            position: 'fixed',
            top:    pos.top,
            bottom: pos.bottom,
            left:   pos.left,
            width:  pos.width,
            zIndex: 99999,
          }}
          className="bg-white rounded-[12px] border border-[#f0eded] shadow-2xl overflow-hidden"
        >
          {/* Buscador (opcional) */}
          {searchable && (
            <div className="p-2 border-b border-[#fafaf9]">
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-[#f6f3f3] rounded-[8px] px-3 py-2 font-['Inter'] text-[13px] text-[#1b1b1c] outline-none placeholder:text-[#a8a29e]"
              />
            </div>
          )}

          {/* Lista de opciones */}
          <ul className="max-h-[240px] overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 font-['Inter'] text-[13px] text-[#a8a29e] text-center">
                Sin resultados
              </li>
            ) : (
              filtered.map(opt => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); pick(opt.value); }}
                    className={[
                      "w-full px-4 py-2.5 text-left",
                      "font-['Inter'] text-[14px] transition-colors duration-100 cursor-pointer",
                      value === opt.value
                        ? "bg-[#fef2f2] text-[#9e2016] font-semibold"
                        : "text-[#1b1b1c] hover:bg-[#f6f3f3]",
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
