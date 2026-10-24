/** "573124099628" → "+57 312 409 9628" */
function formatWhatsapp(numero) {
  const d = String(numero ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) {
    return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  return d ? `+${d}` : '';
}

export default function LandingFooter({ nombre = 'Mágico Sabor', ciudad = 'Cúcuta', whatsapp, horario }) {
  const contacto = [horario, whatsapp && `WhatsApp ${formatWhatsapp(whatsapp)}`].filter(Boolean).join(' · ');

  return (
    <footer className="bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="font-['Manrope'] font-extrabold text-[18px] text-primary-tint">
            {nombre}
          </p>
          <p className="font-['Inter'] font-normal text-[13px] text-zinc-400 mt-0.5">
            Distribuidor Autorizado Crem Helado
          </p>
        </div>

        <div className="text-center sm:text-right">
          {contacto && (
            <p className="font-['Inter'] font-normal text-[12px] text-zinc-400">{contacto}</p>
          )}
          <p className="font-['Inter'] font-normal text-[12px] text-zinc-500 mt-0.5">
            © 2026 {nombre} · {ciudad} · Derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
