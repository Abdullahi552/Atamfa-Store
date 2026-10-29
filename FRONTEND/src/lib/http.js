import axios from 'axios';
import { API_BASE_URL, USE_MOCK } from '@/config/env';
import { tokenStorage } from '@/lib/storage';

export const AUTH_EXPIRED_EVENT = 'atamfa:auth-expired';

/** Normalised error thrown by every API call. */
export class ApiError extends Error {
  constructor(message, { status = 0, code, errors, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code; // machine-readable, e.g. INSUFFICIENT_STOCK
    this.errors = errors; // field errors: { fieldName: 'message' }
    this.details = details;
  }
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

// Demo mode: answer requests from an in-memory API. Tree-shaken out when VITE_USE_MOCK is not "true".
if (USE_MOCK) {
  http.defaults.adapter = async (config) => (await import('@/mocks/mockAdapter')).mockAdapter(config);
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const res = err.response;
    if (!res) {
      const msg = err.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Cannot reach the server. Check your connection.';
      return Promise.reject(new ApiError(msg, { code: 'NETWORK' }));
    }
    const body = res.data && typeof res.data === 'object' ? res.data : {};
    if (res.status === 401 && !err.config?.skipAuthRedirect) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(
      new ApiError(body.message || `Request failed (${res.status})`, {
        status: res.status,
        code: body.code,
        errors: body.errors,
        details: body.details,
      }),
    );
  },
);

const clean = (params) =>
  params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)) : undefined;

export const api = {
  get: (url, params, config) => http.get(url, { params: clean(params), ...config }).then((r) => r.data),
  post: (url, body, config) => http.post(url, body, config).then((r) => r.data),
  put: (url, body, config) => http.put(url, body, config).then((r) => r.data),
  del: (url, config) => http.delete(url, config).then((r) => r.data),
  upload: (url, formData) => http.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};
