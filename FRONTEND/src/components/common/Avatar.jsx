import { assetUrl } from '@/config/env';
import { cx, initials } from '@/lib/format';

export default function Avatar({ user, size = 40, className }) {
  const src = assetUrl(user?.avatarUrl);
  return src ? (
    <img src={src} alt={user?.name || 'Profile'} style={{ width: size, height: size }} className={cx('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-display font-semibold text-accent-fg', className)}>
      {initials(user?.name)}
    </span>
  );
}
