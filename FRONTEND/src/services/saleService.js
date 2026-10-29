import { api } from '@/lib/http';

export const saleService = {
  create: (body) => api.post('/sales', body),
  list: (params) => api.get('/sales', params),
  get: (id) => api.get(`/sales/${id}`),
  refund: (id, reason) => api.post(`/sales/${id}/refund`, { reason }),
  // Held (suspended) carts
  listHeld: () => api.get('/suspended-carts'),
  hold: (body) => api.post('/suspended-carts', body),
  discardHeld: (id) => api.del(`/suspended-carts/${id}`),
};
