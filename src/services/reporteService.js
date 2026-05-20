import api from '../api/axiosConfig';

export async function getReporteFinanciero(fechaInicio, fechaFin) {
    const res = await api.get(
        `/api/reportes/financiero?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
    );

    return res.data;
}

export async function getGraficaInversionIngresos(fechaInicio, fechaFin, tipoPeriodo = 'SEMANA') {
    const res = await api.get(
        `/api/reportes/grafica-inversion-ingresos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&tipo_periodo=${tipoPeriodo}`
    );

    return res.data;
}

export async function getReportePorCanal(fechaInicio, fechaFin) {
    const res = await api.get(
        `/api/reportes/por-canal?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
    );

    return res.data;
}