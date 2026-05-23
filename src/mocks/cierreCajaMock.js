// src/mocks/cierreCajaMock.js
// Datos de prueba — se usan solo cuando VITE_MOCK_CIERRE=true en .env.local

export const MOCK_LISTA = {
  cierres: [
    {
      id: '3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b',
      fecha: '2026-05-23',
      montoCalculadoTotal: 441000,
      montoFisicoTotal: 441000,
      diferenciaTotal: 0,
    },
    {
      id: 'a1b2c3d4-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
      fecha: '2026-05-22',
      montoCalculadoTotal: 380000,
      montoFisicoTotal: 382500,
      diferenciaTotal: 2500,
    },
    {
      id: 'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
      fecha: '2026-05-21',
      montoCalculadoTotal: 512000,
      montoFisicoTotal: 509500,
      diferenciaTotal: -2500,
    },
    {
      id: 'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
      fecha: '2026-05-20',
      montoCalculadoTotal: 295000,
      montoFisicoTotal: 295000,
      diferenciaTotal: 0,
    },
    {
      id: 'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
      fecha: '2026-05-19',
      montoCalculadoTotal: 620000,
      montoFisicoTotal: 618000,
      diferenciaTotal: -2000,
    },
  ],
  total: 5,
  page: 1,
  totalPages: 1,
};

export const MOCK_DETALLE = {
  id: '3f8a92b1-4c2d-4e1f-8a3b-1c2d3e4f5a6b',
  numero: 84920,
  fecha: '2026-05-23',
  montoCalculadoTotal: 441000,
  montoFisicoTotal: 441000,
  diferenciaTotal: 0,
  montoCalculadoVentanilla: 180000,
  montoFisicoVentanilla: 180000,
  diferenciaVentanilla: 0,
  montoCalculadoRural: 156000,
  montoFisicoRural: 156000,
  diferenciaRural: 0,
  montoCalculadoComerciantes: 105000,
  montoFisicoComerciantes: 105000,
  diferenciaComerciantes: 0,
  idTransaccion: 'TRX-2026-0523-84920',
  fechaCreacion: '23/05/2026 - 18:45 PM',
  responsable: 'Ayde Arévalo - Gerente',
  createdAt: '2026-05-23T18:45:00Z',
};
