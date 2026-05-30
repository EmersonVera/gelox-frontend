// src/components/ui/Pagination.jsx
// Componente de paginación reutilizable con numeración inteligente

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PageBtn({ children, onClick, active, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-full font-medium text-sm flex items-center justify-center transition-colors ${
        active
          ? 'bg-[#9e2016] text-white'
          : disabled
          ? 'text-zinc-300 cursor-not-allowed'
          : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Calcula los números de página a mostrar (máx 7).
 * Siempre muestra la primera y la última página.
 * Evita duplicados y números fuera de orden.
 */
function buildPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 4) {
    return [1, 2, 3, 4, 5, 6, totalPages];
  }
  if (page >= totalPages - 3) {
    return [
      1,
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, page - 2, page - 1, page, page + 1, page + 2, totalPages];
}

/**
 * Props:
 *   page        {number}   Página actual (1-indexed)
 *   totalPages  {number}   Total de páginas
 *   onPageChange {fn}      Recibe el número de página destino (1-indexed)
 */
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center gap-1">
      <PageBtn
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <ChevronLeftIcon />
      </PageBtn>

      {pages.map((n, i) => (
        <PageBtn
          key={`${n}-${i}`}
          active={n === page}
          onClick={() => onPageChange(n)}
        >
          {n}
        </PageBtn>
      ))}

      <PageBtn
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        <ChevronRightIcon />
      </PageBtn>
    </div>
  );
}
