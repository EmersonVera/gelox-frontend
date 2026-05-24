import AppLayout from '../../components/AppLayout';
import KpiCards from '../../components/dashboard/KpiCards';
import GraficoInversionIngresos from '../../components/dashboard/GraficoInversionIngresos';
import GraficoVentasPorCanal from '../../components/dashboard/GraficoVentasPorCanal';
import Top5Comerciantes from '../../components/dashboard/Top5Comerciantes';
import FeedEventos from '../../components/dashboard/FeedEventos';
import { useAuth } from '../../context/AuthContext';

export default function DashboardGerente() {
  const { usuario, perfil } = useAuth();
  const nombre = (usuario?.displayName ?? perfil?.nombre ?? 'usuario').split(' ')[0];

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 animate-fade-in-up">
        <div>
          <h1 className="font-display font-extrabold text-[30px] text-ink tracking-[-0.75px] leading-[36px]">
            Vista General
          </h1>
          <p className="font-inter font-normal text-[16px] text-muted leading-[24px]">
            Buen día, {nombre}. Aquí está el resumen de operaciones para hoy.
          </p>
        </div>

        {/* RF07 — KPI Cards */}
        <KpiCards />

        {/* RF08 + RF09 — Gráficos */}
        <div className="grid grid-cols-3 gap-8">
          <GraficoInversionIngresos />
          <GraficoVentasPorCanal />
        </div>

        {/* RF10 + RF11 — Top 5 Comerciantes y Feed de Actividad */}
        <div className="grid grid-cols-2 gap-8">
          <Top5Comerciantes />
          <FeedEventos />
        </div>
      </div>
    </AppLayout>
  );
}
