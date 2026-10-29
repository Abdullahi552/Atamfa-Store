import { api } from '@/lib/http';

export const dashboardService = { get: () => api.get('/dashboard') };

export const settingsService = {
  get: () => api.get('/settings'),
  update: (body) => api.put('/settings', body),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.upload('/settings/logo', fd);
  },
};

export const notificationService = {
  list: () => api.get('/notifications'),
  markAllRead: () => api.post('/notifications/read-all'),
};
