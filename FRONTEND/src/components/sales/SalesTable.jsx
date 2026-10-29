import { Receipt as ReceiptIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/common/Badges';
import { formatDateTime, formatNaira } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/constants';

export default function SalesTable({ rows = [], onOpen, showCashier = true }) {
  if (!rows.length) return <EmptyState icon={ReceiptIcon} title="No sales found" text="Try changing the filters or date range." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr><th className="th">Receipt</th><th className="th">Date</th>{showCashier && <th className="th">Cashier</th>}<th className="th">Items</th><th className="th">Payment</th><th className="th text-right">Total</th><th className="th">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="tr cursor-pointer hover:bg-surface2" onClick={() => onOpen(s)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(s)}>
              <td className="td num font-semibold">{s.receiptNumber}</td>
              <td className="td text-muted">{formatDateTime(s.createdAt)}</td>
              {showCashier && <td className="td">{s.cashier?.name}</td>}
              <td className="td num">{s.itemsCount}</td>
              <td className="td">{PAYMENT_METHODS.find((m) => m.value === s.paymentMethod)?.label || s.paymentMethod}</td>
              <td className="td num text-right font-semibold">{formatNaira(s.total)}</td>
              <td className="td"><StatusBadge status={s.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
