import api from '../api/axiosConfig';
import * as mock from './mocks/mockUsuarios';

// RF62 — usuarios internos de la distribuidora del Gerente. El backend actual ya responde
// estos endpoints, así que el mock es opcional: se activa con VITE_USAR_MOCK_USUARIOS=true
// en el .env para probar los casos de T121 (esGerenteTitular, 404 de otra distribuidora,
// 400 por rol) antes de la integración.
export const USAR_MOCK = import.meta.env.VITE_USAR_MOCK_USUARIOS === 'true';

// Todas devuelven la respuesta de axios ({ data }), igual que antes.

export const getUsuarios = () => (USAR_MOCK ? mock.listar() : api.get('/api/usuarios'));

/** 404 si el usuario no existe o es de otra distribuidora. */
export const obtenerUsuario = (id) => (USAR_MOCK ? mock.obtener(id) : api.get(`/api/usuarios/${id}`));

/** dto: { nombre, correo, contrasenaTemporal, rol } o FormData con foto. */
export const crearUsuario = (dto) => (USAR_MOCK ? mock.crear(dto) : api.post('/api/usuarios', dto));

/** dto: { nombre, correo, rol } o FormData con foto. */
export const editarUsuario = (id, dto) => (USAR_MOCK ? mock.editar(id, dto) : api.put(`/api/usuarios/${id}`, dto));

export const deshabilitarUsuario = (id) =>
  USAR_MOCK ? mock.deshabilitar(id) : api.delete(`/api/usuarios/${id}`);

export const habilitarUsuario = (id) =>
  USAR_MOCK ? mock.habilitar(id) : api.patch(`/api/usuarios/${id}/habilitar`);
