import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Package, Receipt } from 'lucide-react';
import { notificationService } from '@/services/miscService';
import { useClickOutside } from '@/hooks/useClickOutside';
import { formatDateTime, cx } from '@/lib/format';

const ICONS = { low_stock: Package, sale: Receipt };

/** Pill with unread count (like the reference design). Polls every 60s. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const load = useCallback(async () => {
    try { const res = await notificationService.list(); setItems(res.data || []); } catch { /* silent: bell is non-critical */ }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const unread = items.filter((n) => !n.read).length;
  const markAll = async () => { try { await notificationService.markAllRead(); setItems((l) => l.map((n) => ({ ...n, read: true }))); } catch { /* ignore */ } };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications" className="flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-sm font-semibold hover:bg-surface2">
        <Bell className="h-[18px] w-[18px]" />
        <span className="num">{unread}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(92vw,360px)] animate-pop-in rounded-3xl bg-surface p-2 shadow-pop ring-1 ring-line">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-display text-base font-semibold">Notifications</p>
            {unread > 0 && <button onClick={markAll} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">You're all caught up.</p>}
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <div key={n.id} className={cx('flex gap-3 rounded-2xl px-3 py-2.5', !n.read && 'bg-surface2')}>
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-sm text-muted">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
