import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { Input, Select } from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import Pagination from '@/components/ui/Pagination';
import SalesTable from '@/components/sales/SalesTable';
import SaleModal from '@/components/sales/SaleModal';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { cashierService } from '@/services/cashierService';
import { productService } from '@/services/productService';
import { saleService } from '@/services/saleService';
import { PAYMENT_METHODS, SALE_STATUSES } from '@/lib/constants';
import { daysAgo, toDateInput } from '@/lib/format';

const EMPTY = { from: daysAgo(30), to: toDateInput(), cashierId: '', productId: '', status: '', paymentMethod: '', search: '' };

export default function Sales() {
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const search = useDebounce(f.search);
  const cashiers = useAsync(() => cashierService.list(), []);
  const products = useAsync(() => productService.list({ limit: 500, status: 'all', sortBy: 'name' }), []);
  const { data, loading, error, reload } = useAsync(
    () => saleService.list({ ...f, search, page, limit: 15 }),
    [f.from, f.to, f.cashierId, f.productId, f.status, f.paymentMethod, search, page],
  );
  const set = (patch) => { setF((p) => ({ ...p, ...patch })); setPage(1); };
  const L = ({ label, children }) => <label className="text-xs font-medium text-muted">{label}<div className="mt-1">{children}</div></label>;

  return (
    <>
      <PageHeader title="Sales" subtitle="Every transaction across all cashiers." />
      <div className="card overflow-hidden">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <L label="From"><Input type="date" value={f.from} max={f.to} onChange={(e) => set({ from: e.target.value })} /></L>
          <L label="To"><Input type="date" value={f.to} min={f.from} onChange={(e) => set({ to: e.target.value })} /></L>
          <L label="Cashier"><Select value={f.cashierId} onChange={(e) => set({ cashierId: e.target.value })}><option value="">All cashiers</option>{cashiers.data?.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></L>
          <L label="Material"><Select value={f.productId} onChange={(e) => set({ productId: e.target.value })}><option value="">All materials</option>{products.data?.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></L>
          <L label="Status"><Select value={f.status} onChange={(e) => set({ status: e.target.value })}><option value="">All statuses</option>{SALE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></L>
          <L label="Payment"><Select value={f.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })}><option value="">All methods</option>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></L>
          <L label="Receipt number"><Input placeholder="e.g. RCP-000123" value={f.search} onChange={(e) => set({ search: e.target.value })} /></L>
          <div className="flex items-end"><Button variant="soft" onClick={() => { setF(EMPTY); setPage(1); }}>Reset filters</Button></div>
        </div>
        {loading && !data ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          : error ? <ErrorState error={error} onRetry={reload} />
          : <SalesTable rows={data.data} onOpen={setOpen} />}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>
      {open && <SaleModal saleId={open.id} canRefund onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}
