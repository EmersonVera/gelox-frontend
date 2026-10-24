function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function RelojIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/** info — InfoNegocioDTO { direccion, barrio, ciudad, horario, enlaceComoLlegar } o null. */
export default function UbicacionSection({ info, cargando }) {
  const datos = info;
  const barrio = datos?.barrio || 'Pueblo Nuevo';
  const ciudad = datos?.ciudad || 'Cúcuta';

  return (
    <section id="ubicacion" className="overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-lg">
          {/* Left — red */}
          <div className="bg-primary p-10 md:p-14 flex flex-col gap-7">
            <h2 className="font-['Manrope'] font-extrabold text-[28px] md:text-[32px] text-white leading-tight">
              Encuéntranos en el corazón de {ciudad}
            </h2>

            {cargando || !datos ? (
              <div className="flex flex-col gap-3">
                <div className="h-4 bg-white/20 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-white/20 rounded animate-pulse w-1/2" />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3 text-white">
                  <div className="mt-0.5 opacity-80 flex-shrink-0"><PinIcon /></div>
                  <div>
                    <p className="font-['Inter'] font-semibold text-[15px]">{datos.direccion}</p>
                    <p className="font-['Inter'] font-normal text-[13px] text-white/70 mt-0.5">{datos.barrio} · {datos.ciudad}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-white">
                  <div className="mt-0.5 opacity-80 flex-shrink-0"><RelojIcon /></div>
                  <p className="font-['Inter'] font-normal text-[15px]">{datos.horario}</p>
                </div>
              </div>
            )}

            <a
              href={datos?.enlaceComoLlegar || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start mt-2 bg-white text-primary font-['Inter'] font-bold text-[14px] px-6 py-3 rounded-xl hover:bg-primary-tint transition-all duration-200 active:scale-95"
            >
              Cómo llegar 🗺
            </a>
          </div>

          {/* Right — pink */}
          <div className="bg-primary-tint/50 flex items-center justify-center p-10 min-h-[240px]">
            <div className="text-center">
              <span className="text-8xl select-none" role="img" aria-label="Ubicación">📍</span>
              <p className="font-['Manrope'] font-bold text-[16px] text-primary mt-4">
                {barrio}, {ciudad}
              </p>
              <p className="font-['Inter'] font-normal text-[13px] text-zinc-500 mt-1">
                {datos ? 'Colombia' : 'Norte de Santander, Colombia'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
