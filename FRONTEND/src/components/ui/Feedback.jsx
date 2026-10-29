import { AlertTriangle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cx } from '@/lib/format';

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-muted', className)} />;
}

export function FullPageSpinner() {
  return <div className="flex min-h-screen items-center justify-center bg-bg"><Spinner className="h-8 w-8" /></div>;
}

export function Skeleton({ className }) {
  return <div className={cx('animate-pulse rounded-xl bg-surface2', className)} />;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface2 text-muted"><Icon className="h-6 w-6" /></div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rust/10 text-rust"><AlertTriangle className="h-6 w-6" /></div>
      <p className="font-display text-lg font-semibold">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{error?.message || 'Could not load this data.'}</p>
      {onRetry && <Button className="mt-4" variant="outline" onClick={() => onRetry()}>Try again</Button>}
    </div>
  );
}

const TONES = {
  neutral: 'bg-surface2 text-muted',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-gold/20 text-gold',
  danger: 'bg-rust/15 text-rust',
  accent: 'bg-accent text-accent-fg',
  dark: 'bg-primary text-primary-fg',
};
export function Badge({ tone = 'neutral', className, children }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone], className)}>{children}</span>;
}
