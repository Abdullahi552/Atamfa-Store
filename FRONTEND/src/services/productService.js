import { api } from '@/lib/http';

export const productService = {
  list: (params) => api.get('/products', params),
  get: (id) => api.get(`/products/${id}`),
  create: (body) => api.post('/products', body),
  update: (id, body) => api.put(`/products/${id}`, body),
  archive: (id) => api.del(`/products/${id}`),
  restore: (id) => api.put(`/products/${id}`, { archived: false }),
};
