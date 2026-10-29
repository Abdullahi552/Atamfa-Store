import { StatusBadge } from '@/components/common/Badges';
import { formatNaira, formatTime } from '@/lib/format';

export default function RecentOrders({ orders = [], onOpen }) {
  return (
    <section aria-label="Recent orders">
      <h2 className="mb-2 text-base font-semibold">Recent orders</h2>
      {!orders.length ? <p className="tile px-4 py-3 text-sm text-muted">No orders yet today.</p> : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {orders.map((o) => (
            <button key={o.id} onClick={() => onOpen(o)} className="card min-w-[168px] shrink-0 p-3 text-left transition hover:ring-2 hover:ring-accent">
              <div className="flex items-center justify-between gap-2"><span className="num text-sm font-semibold">{o.receiptNumber}</span><span className="text-xs text-muted">{formatTime(o.createdAt)}</span></div>
              <p className="num mt-1 text-lg font-semibold">{formatNaira(o.total)}</p>
              <div className="mt-1"><StatusBadge status={o.status} /></div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
