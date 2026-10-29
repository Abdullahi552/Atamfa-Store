import { Loader2 } from 'lucide-react';
import { cx } from '@/lib/format';

const VARIANTS = {
  primary: 'bg-primary text-primary-fg hover:brightness-110',
  accent: 'bg-accent text-accent-fg hover:brightness-95',
  outline: 'border border-line bg-surface text-ink hover:bg-surface2',
  soft: 'bg-surface2 text-ink hover:bg-line',
  ghost: 'text-ink hover:bg-surface2',
  danger: 'bg-rust text-white hover:brightness-110',
};
const SIZES = { sm: 'h-8 gap-1.5 px-3 text-xs', md: 'h-10 gap-2 px-4 text-sm', lg: 'h-12 gap-2 px-6 text-base' };

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx('inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, className, variant = 'outline', ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition', VARIANTS[variant], className)} {...props}>
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
