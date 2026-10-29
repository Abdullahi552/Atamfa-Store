import { api } from '@/lib/http';

export const cashierService = {
  list: () => api.get('/cashiers'),
  create: (body) => api.post('/cashiers', body),
  update: (id, body) => api.put(`/cashiers/${id}`, body),
  deactivate: (id) => api.del(`/cashiers/${id}`),
  resetPassword: (id) => api.post(`/cashiers/${id}/reset-password`),
};
