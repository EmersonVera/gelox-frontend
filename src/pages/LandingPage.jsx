import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import LandingNav from '../components/landing/LandingNav';
import HeroSection from '../components/landing/HeroSection';
import BeneficiosSection from '../components/landing/BeneficiosSection';
import CatalogoSection from '../components/landing/CatalogoSection';
import PasosSection from '../components/landing/PasosSection';
import UbicacionSection from '../components/landing/UbicacionSection';
import WhatsAppFloat from '../components/landing/WhatsAppFloat';
import LandingFooter from '../components/landing/LandingFooter';
import {
  obtenerIdentidadLanding,
  obtenerInfoNegocio,
  obtenerProductosLanding,
  obtenerWhatsappLanding,
} from '../services/distribuidoraService';
import { esHexValido, oscurecer, tintar } from '../context/identidadUtils';

const FALLBACK_WA = 'https://wa.me/573124099628';

// /landing (sin subdominio) sigue mostrando Mágico Sabor con los endpoints de siempre.
const IDENTIDAD_PILOTO = {
  nombreComercial: 'Mágico Sabor',
  logoUrl: null,
  colorPrimario: '#9E2016',
  colorSecundario: '#7C0202',
};

async function cargarPiloto() {
  const [info, productos, waUrl] = await Promise.all([
    api.get('/api/landing/info-negocio').then((r) => r.data).catch(() => null),
    api.get('/api/landing/productos').then((r) => r.data).catch(() => null),
    api.get('/api/landing/whatsapp').then((r) => r.data.url || FALLBACK_WA).catch(() => FALLBACK_WA),
  ]);
  return { identidad: IDENTIDAD_PILOTO, info, productos, waUrl };
}

// RF61: info-negocio o identidad en 404 (inexistente, SUSPENDIDO o INACTIVO) → página no disponible.
async function cargarPorSubdominio(subdominio) {
  const [info, identidad, productos, waUrl] = await Promise.all([
    obtenerInfoNegocio(subdominio),
    obtenerIdentidadLanding(subdominio),
    obtenerProductosLanding(subdominio).catch(() => null),
    obtenerWhatsappLanding(subdominio).then((r) => r.url || '').catch(() => ''),
  ]);
  return { identidad, info, productos, waUrl };
}

function NoDisponible({ mensaje }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 font-['Inter']">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl shadow-sm p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l1-5h16l1 5" />
            <path d="M5 20h14a1 1 0 0 0 1-1v-7H4v7a1 1 0 0 0 1 1z" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </div>
        <h1 className="font-['Manrope'] font-extrabold text-[24px] text-zinc-900 leading-tight mt-6">
          Esta distribuidora no está disponible
        </h1>
        <p className="font-['Inter'] text-[14px] text-zinc-500 leading-[1.6] mt-3">{mensaje}</p>
        <p className="font-['Manrope'] font-bold text-[13px] text-zinc-300 tracking-[0.5px] mt-8">GELOX</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { subdominio } = useParams();
  const clave = subdominio ?? '';
  // Cada respuesta se guarda con el subdominio que la pidió; así un cambio de
  // ruta no muestra datos de otra distribuidora mientras carga.
  const [estado, setEstado] = useState(null);

  useEffect(() => {
    let vivo = true;
    (subdominio ? cargarPorSubdominio(subdominio) : cargarPiloto())
      .then((datos) => { if (vivo) setEstado({ clave, ...datos }); })
      .catch((err) => { if (vivo) setEstado({ clave, error: err?.response?.status ?? 'red' }); });
    return () => { vivo = false; };
  }, [subdominio, clave]);

  const actual = estado?.clave === clave ? estado : null;

  if (actual?.error) {
    return (
      <NoDisponible
        mensaje={actual.error === 404
          ? 'Verifica el enlace o comunícate directamente con la distribuidora.'
          : 'No pudimos cargar esta página. Intenta de nuevo en unos minutos.'}
      />
    );
  }

  if (subdominio && !actual) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-[3px] border-zinc-200 border-t-zinc-500 animate-spin" />
      </div>
    );
  }

  const identidad = actual?.identidad ?? IDENTIDAD_PILOTO;
  const info      = actual?.info ?? null;
  // Un campo vacío del backend usa el texto actual de la plantilla (props por defecto).
  const dato = (campo) => info?.[campo] || undefined;
  const waUrl     = actual?.waUrl ?? '';
  const nombre    = identidad.nombreComercial || info?.nombreComercial || IDENTIDAD_PILOTO.nombreComercial;
  const primario   = esHexValido(identidad.colorPrimario) ? identidad.colorPrimario : IDENTIDAD_PILOTO.colorPrimario;
  const secundario = esHexValido(identidad.colorSecundario) ? identidad.colorSecundario : IDENTIDAD_PILOTO.colorSecundario;

  // Los tokens de la plantilla se redefinen solo dentro de la landing: bg-primary,
  // text-primary, etc. toman los colores de esta distribuidora.
  const tokens = {
    '--color-primary': primario,
    '--color-primary-dark': oscurecer(primario),
    '--color-primary-tint': tintar(primario),
    '--color-secundario': secundario,
  };

  return (
    <div className="min-h-screen bg-white font-['Inter']" style={tokens}>
      <LandingNav nombre={nombre} logoUrl={identidad.logoUrl} />
      <HeroSection
        waUrl={waUrl}
        nombre={nombre}
        eslogan={dato('eslogan')}
        barrio={dato('barrio')}
        ciudad={dato('ciudad')}
        horario={dato('horario')}
      />
      <BeneficiosSection />
      <CatalogoSection waUrl={waUrl} productos={actual?.productos ?? null} cargando={!actual} />
      <PasosSection nombre={nombre} barrio={dato('barrio')} />
      <UbicacionSection info={info} cargando={!actual} />
      <LandingFooter nombre={nombre} ciudad={dato('ciudad')} whatsapp={dato('whatsapp')} horario={dato('horario')} />
      <WhatsAppFloat waUrl={waUrl} />
    </div>
  );
}
