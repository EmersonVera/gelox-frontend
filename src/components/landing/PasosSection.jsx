function CubiertosIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TiendaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

const PASOS = [
  {
    num: 1,
    Icono: CubiertosIcon,
    titulo: 'Elige tus favoritos',
    descripcion: 'Navega por nuestro catálogo y selecciona los helados que más te antojen.',
  },
  {
    num: 2,
    Icono: ChatIcon,
    titulo: 'Escríbenos al WhatsApp',
    descripcion: 'Envíanos tu pedido. Te confirmaremos disponibilidad y valor total al instante.',
  },
  {
    num: 3,
    Icono: TiendaIcon,
    titulo: 'Recoge en nuestro local',
    descripcion: 'Pasa por nuestro punto en Pueblo Nuevo y disfruta de tu pedido bien frío.',
  },
];

export default function PasosSection() {
  return (
    <section className="bg-zinc-50 py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-['Manrope'] font-extrabold text-[32px] text-zinc-900 leading-tight">
            ¿Cómo disfrutar tu Mágico Sabor?
          </h2>
          <p className="font-['Inter'] font-normal text-[16px] text-zinc-500 mt-2">
            Simple, rápido y delicioso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PASOS.map(({ num, Icono, titulo, descripcion }) => (
            <div
              key={num}
              className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-7 flex flex-col gap-4 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-700 text-white font-['Manrope'] font-extrabold text-[16px] flex items-center justify-center flex-shrink-0">
                  {num}
                </div>
                <div className="text-zinc-400">
                  <Icono />
                </div>
              </div>
              <div>
                <p className="font-['Manrope'] font-bold text-[16px] text-zinc-900">{titulo}</p>
                <p className="font-['Inter'] font-normal text-[13px] text-zinc-500 leading-[1.65] mt-1.5">
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
