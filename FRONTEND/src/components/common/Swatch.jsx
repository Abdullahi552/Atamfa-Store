import { cx } from '@/lib/format';

export function isLight(hex = '#000000') {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

/** Round colour dot. */
export function Swatch({ color, size = 16, className }) {
  return (
    <span
      title={color?.name}
      className={cx('inline-block shrink-0 rounded-full ring-1 ring-black/15', className)}
      style={{ width: size, height: size, background: color?.hex || '#d4d4d4' }}
    />
  );
}

/** Overlapping row of dots, e.g. in tables. */
export function SwatchRow({ colors = [], max = 4, size = 18 }) {
  const shown = colors.slice(0, max);
  return (
    <div className="flex items-center">
      {shown.map((c, i) => <Swatch key={c.hex + i} color={c} size={size} className={cx(i > 0 && '-ml-1.5', 'ring-2 ring-surface')} />)}
      {colors.length > max && <span className="ml-1.5 text-xs text-muted">+{colors.length - max}</span>}
    </div>
  );
}

/** Woven block of the cloth's colour(s). Replaces a product photo everywhere. */
export function FabricTile({ colors = [], className }) {
  const list = colors.length ? colors : [{ hex: '#d4d4d4' }];
  return (
    <div className={cx('relative flex overflow-hidden rounded-2xl ring-1 ring-black/5', className)}>
      {list.map((c, i) => <div key={c.hex + i} className="flex-1" style={{ background: c.hex }} />)}
      <div className="weave pointer-events-none absolute inset-0" />
    </div>
  );
}
