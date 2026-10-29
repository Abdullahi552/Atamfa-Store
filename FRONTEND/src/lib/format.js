const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 });
const int = new Intl.NumberFormat('en-NG');

export const formatNaira = (n) => naira.format(Number(n) || 0);
export const formatCompactNaira = (n) => `₦${compact.format(Number(n) || 0)}`;
export const formatNumber = (n) => int.format(Number(n) || 0);
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-NG', opts).format(new Date(iso));
}
export const formatTime = (iso) => (iso ? new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '—');
export const formatDateTime = (iso) => (iso ? `${formatDate(iso)}, ${formatTime(iso)}` : '—');

export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** yyyy-mm-dd in the browser's local time (what <input type="date"> uses). */
export function toDateInput(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d);
}

export const cx = (...parts) => parts.filter(Boolean).join(' ');
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
