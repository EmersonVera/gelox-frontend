import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'Inicio',       href: '#inicio'    },
  { label: 'Catálogo',     href: '#catalogo'  },
  { label: 'Encuéntranos', href: '#ubicacion' },
];

function scrollTo(e, href) {
  e.preventDefault();
  const id = href.replace('#', '');
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingNav() {
  const [active, setActive] = useState('inicio');

  useEffect(() => {
    const ids = NAV_LINKS.map(({ href }) => href.replace('#', ''));

    const observer = new IntersectionObserver(
      (entries) => {
        // De todos los que están visibles, quedarnos con el que tiene más ratio
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      {
        // Disparar cuando al menos el 20% de la sección esté visible
        threshold: 0.2,
        // Descontar la altura del navbar (64 px) del top del viewport
        rootMargin: '-64px 0px 0px 0px',
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-zinc-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="font-['Manrope'] font-extrabold text-[22px] text-red-700 tracking-tight">
          Mágico Sabor
        </span>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => {
            const id = href.replace('#', '');
            const isActive = active === id;
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => scrollTo(e, href)}
                className={`font-['Inter'] font-medium text-[14px] px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-red-700 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
