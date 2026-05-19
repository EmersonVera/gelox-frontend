export default function LandingFooter() {
  return (
    <footer className="bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-['Manrope'] font-extrabold text-[18px] text-red-400">
            Mágico Sabor
          </p>
          <p className="font-['Inter'] font-normal text-[13px] text-zinc-400 mt-0.5">
            Distribuidor Autorizado Crem Helado
          </p>
        </div>

        <p className="font-['Inter'] font-normal text-[12px] text-zinc-500 text-center sm:text-right">
          © 2026 Mágico Sabor · Cúcuta · Derechos reservados
        </p>
      </div>
    </footer>
  );
}
