import { api } from '@/lib/http';

export const authService = {
  login: (username, password) => api.post('/auth/login', { username, password }, { skipAuthRedirect: true }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword }),
  updateProfile: (body) => api.put('/auth/profile', body),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.upload('/auth/avatar', fd);
  },
};
