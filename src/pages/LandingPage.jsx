import LandingNav from '../components/landing/LandingNav';
import HeroSection from '../components/landing/HeroSection';
import BeneficiosSection from '../components/landing/BeneficiosSection';
import CatalogoSection from '../components/landing/CatalogoSection';
import PasosSection from '../components/landing/PasosSection';
import UbicacionSection from '../components/landing/UbicacionSection';
import WhatsAppFloat from '../components/landing/WhatsAppFloat';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-['Inter']">
      <LandingNav />
      <HeroSection />
      <BeneficiosSection />
      <CatalogoSection />
      <PasosSection />
      <UbicacionSection />
      <LandingFooter />
      <WhatsAppFloat />
    </div>
  );
}
