import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { Input, Select } from '@/components/ui/Field';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import Pagination from '@/components/ui/Pagination';
import SalesTable from '@/components/sales/SalesTable';
import SaleModal from '@/components/sales/SaleModal';
import { useAsync } from '@/hooks/useAsync';
import { saleService } from '@/services/saleService';
import { SALE_STATUSES } from '@/lib/constants';
import { daysAgo, toDateInput } from '@/lib/format';

export default function MySales() {
  const [f, setF] = useState({ from: daysAgo(7), to: toDateInput(), status: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useAsync(() => saleService.list({ ...f, page, limit: 15 }), [f.from, f.to, f.status, page]);
  const set = (patch) => { setF({ ...f, ...patch }); setPage(1); };

  return (
    <>
      <PageHeader title="My sales" subtitle="Only your own transactions are shown." />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="text-xs font-medium text-muted">From<Input type="date" value={f.from} max={f.to} onChange={(e) => set({ from: e.target.value })} className="mt-1" /></label>
          <label className="text-xs font-medium text-muted">To<Input type="date" value={f.to} min={f.from} onChange={(e) => set({ to: e.target.value })} className="mt-1" /></label>
          <label className="text-xs font-medium text-muted">Status
            <Select value={f.status} onChange={(e) => set({ status: e.target.value })} className="mt-1"><option value="">All</option>{SALE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
          </label>
        </div>
        {loading && !data ? <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
          : error ? <ErrorState error={error} onRetry={reload} />
          : <SalesTable rows={data.data} showCashier={false} onOpen={setOpen} />}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>
      {open && <SaleModal saleId={open.id} canRefund refundLabel="Mark as not paid" onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}
