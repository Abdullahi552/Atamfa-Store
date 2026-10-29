const env = import.meta.env;

export const API_BASE_URL = env.VITE_API_BASE_URL || '/api';
export const ASSET_BASE_URL = env.VITE_ASSET_BASE_URL || '';
export const USE_MOCK = env.VITE_USE_MOCK === 'true';
export const APP_NAME = env.VITE_APP_NAME || 'Atamfa POS';

/** Turns a path returned by the API (e.g. /uploads/logo.png) into a usable URL. */
export function assetUrl(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${ASSET_BASE_URL}${path}`;
}
