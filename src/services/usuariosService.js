import api from '../api/axiosConfig';

export const getUsuarios = () => api.get('/api/usuarios');

export const crearUsuario = (dto) => api.post('/api/usuarios', dto);

export const deshabilitarUsuario = (id) =>
  api.delete(`/api/usuarios/${id}/deshabilitar`);

export const habilitarUsuario = (id) =>
  api.post(`/api/usuarios/${id}/habilitar`);
