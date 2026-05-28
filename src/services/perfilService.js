import api from '../api/axiosConfig';

export const updatePerfil = (id, data) =>
  api.put(`/api/perfil/${id}`, data);

export const updateFotoPerfil = (id, file) => {
  const formData = new FormData();
  formData.append('foto', file);
  // No poner Content-Type manual — el interceptor lo elimina para que el
  // navegador genere multipart/form-data con el boundary correcto.
  return api.put(`/api/perfil/${id}`, formData);
};

export const cambiarContrasena = (id, dto) =>
  api.put(`/api/perfil/${id}/contrasena`, dto);
