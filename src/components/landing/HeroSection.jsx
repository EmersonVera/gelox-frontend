import heroImg from '../../assets/hero.png';

const waUrl = `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`;

function scrollToCatalogo() {
  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
}

export default function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-white"
    >
      {/* background gradient blob */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-bl from-red-50 via-rose-50 to-white pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Text side */}
        <div className="flex flex-col gap-6">
          <span className="inline-flex items-center self-start gap-2 bg-red-50 text-red-700 font-['Inter'] font-bold text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
            Oficial Crem Helado
          </span>

          <h1 className="font-['Manrope'] font-extrabold text-[42px] md:text-[52px] text-red-700 leading-[1.1] tracking-tight">
            Tu antojo de Crem Helado a un clic
          </h1>

          <p className="font-['Inter'] font-normal text-[17px] text-zinc-500 leading-[1.7] max-w-md">
            Distribuidor oficial en Cúcuta, Barrio Pueblo Nuevo. Venta al por mayor y al detal con la frescura que nos caracteriza.
          </p>

          <div className="flex flex-wrap gap-3 mt-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-700 hover:bg-red-800 text-white font-['Inter'] font-semibold text-[15px] px-6 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-red-700/20"
            >
              Pedir por WhatsApp →
            </a>
            <button
              onClick={scrollToCatalogo}
              className="border border-zinc-300 hover:border-zinc-400 bg-white text-zinc-800 font-['Inter'] font-semibold text-[15px] px-6 py-3 rounded-xl transition-all duration-200 active:scale-95"
            >
              Ver Catálogo
            </button>
          </div>
        </div>

        {/* Image side */}
        <div className="relative flex justify-center">
          <img
            src={heroImg}
            alt="Helados Mágico Sabor"
            className="w-full max-w-sm md:max-w-full object-contain drop-shadow-2xl rounded-2xl"
          />

          {/* Floating card */}
          <div className="absolute bottom-4 left-0 md:-left-6 bg-white rounded-2xl shadow-xl border border-zinc-100 p-4 flex items-start gap-3 max-w-[240px]">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <p className="font-['Manrope'] font-bold text-[13px] text-zinc-900">Pueblo Nuevo</p>
              <p className="font-['Inter'] font-normal text-[11px] text-zinc-500 leading-[1.5] mt-0.5">
                Sabor auténtico desde las 7 AM hasta las 10 PM todos los días.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
