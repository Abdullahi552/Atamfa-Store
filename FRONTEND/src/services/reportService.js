import { api } from '@/lib/http';

export const reportService = {
  daily: (date) => api.get('/reports/daily', { date }),
  weekly: (date) => api.get('/reports/weekly', { date }),
  monthly: (month) => api.get('/reports/monthly', { month }),
  custom: (from, to) => api.get('/reports/custom', { from, to }),
  bestSellers: (params) => api.get('/reports/bestsellers', params),
  slowMovers: (params) => api.get('/reports/slowmovers', params),
  lowStock: () => api.get('/reports/lowstock'),
  inventory: () => api.get('/reports/inventory'),
  activity: (params) => api.get('/reports/activity', params),
};
