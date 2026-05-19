function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PrecioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function BilleteraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

const BENEFICIOS = [
  {
    Icono: CheckIcon,
    titulo: 'Marca Líder',
    descripcion: 'Calidad garantizada con el respaldo de Crem Helado en cada producto.',
  },
  {
    Icono: PrecioIcon,
    titulo: 'Precios de Distribuidor',
    descripcion: 'Ahorra comprando directamente sin intermediarios, al mayor y detal.',
  },
  {
    Icono: BilleteraIcon,
    titulo: 'Facilidad de Pago',
    descripcion: 'Aceptamos diversos medios para que disfrutes tu antojo sin complicaciones.',
  },
];

export default function BeneficiosSection() {
  return (
    <section className="bg-zinc-50 border-y border-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BENEFICIOS.map(({ Icono, titulo, descripcion }) => (
            <div key={titulo} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                <Icono />
              </div>
              <div>
                <p className="font-['Manrope'] font-bold text-[15px] text-zinc-900">{titulo}</p>
                <p className="font-['Inter'] font-normal text-[13px] text-zinc-500 leading-[1.6] mt-1">
                  {descripcion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
