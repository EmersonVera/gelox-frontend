import { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import LandingNav from '../components/landing/LandingNav';
import HeroSection from '../components/landing/HeroSection';
import BeneficiosSection from '../components/landing/BeneficiosSection';
import CatalogoSection from '../components/landing/CatalogoSection';
import PasosSection from '../components/landing/PasosSection';
import UbicacionSection from '../components/landing/UbicacionSection';
import WhatsAppFloat from '../components/landing/WhatsAppFloat';
import LandingFooter from '../components/landing/LandingFooter';

const FALLBACK_WA = 'https://wa.me/573124099628';

export default function LandingPage() {
  const [waUrl, setWaUrl] = useState('');

  useEffect(() => {
    api.get('/api/landing/whatsapp')
      .then((r) => setWaUrl(r.data.url || FALLBACK_WA))
      .catch(() => setWaUrl(FALLBACK_WA));
  }, []);

  return (
    <div className="min-h-screen bg-white font-['Inter']">
      <LandingNav />
      <HeroSection waUrl={waUrl} />
      <BeneficiosSection />
      <CatalogoSection waUrl={waUrl} />
      <PasosSection />
      <UbicacionSection />
      <LandingFooter />
      <WhatsAppFloat waUrl={waUrl} />
    </div>
  );
}
