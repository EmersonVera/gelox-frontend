import api from '../api/axiosConfig';

export const updatePerfil = (id, data) =>
  api.put(`/api/perfil/${id}`, data);

export const updateFotoPerfil = (id, file) => {
  const formData = new FormData();
  formData.append('foto', file);
  return api.put(`/api/perfil/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const cambiarContrasena = (id, dto) =>
  api.post(`/api/perfil/${id}/cambiar-contrasena`, dto);
