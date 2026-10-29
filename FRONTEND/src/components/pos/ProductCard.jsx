import { FabricTile } from '@/components/common/Swatch';
import { StockBadge } from '@/components/common/Badges';
import { formatNaira, cx } from '@/lib/format';

export default function ProductCard({ product, onPick }) {
  const out = product.stock <= 0;
  return (
    <button
      type="button" disabled={out} onClick={() => onPick(product)}
      className={cx('group flex flex-col rounded-3xl bg-surface p-3 text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:ring-0')}
    >
      <FabricTile colors={product.colors} className="h-24 w-full" />
      <div className="mt-3 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</p>
        <p className="num mt-0.5 text-xs text-muted">{product.code}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="num text-lg font-semibold">{formatNaira(product.pricePerPic)}</p>
        <div className="text-right">
          <StockBadge stock={product.stock} threshold={product.lowStockThreshold} />
          <p className="num mt-0.5 text-xs text-muted">{out ? 'Sold out' : `${product.stock} pics`}</p>
        </div>
      </div>
    </button>
  );
}
