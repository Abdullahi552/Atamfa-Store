import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import Pagination from '@/components/ui/Pagination';
import { FabricTile, SwatchRow } from '@/components/common/Swatch';
import { RevenueBars } from '@/components/charts/TrendCharts';
import { useAsync } from '@/hooks/useAsync';
import { reportService } from '@/services/reportService';
import { cashierService } from '@/services/cashierService';
import { downloadCsv } from '@/lib/csv';
import { cx, daysAgo, formatDate, formatDateTime, formatDuration, formatNaira, formatNumber, toDateInput } from '@/lib/format';

const TABS = [
  ['sales', 'Sales & profit'], ['bestsellers', 'Best sellers'], ['slowmovers', 'Slow movers'], ['inventory', 'Inventory'], ['activity', 'Cashier activity'],
];

function ExportBar({ onCsv, disabled }) {
  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" icon={Download} onClick={onCsv} disabled={disabled}>Export Excel (CSV)</Button>
      <Button variant="outline" icon={Printer} onClick={() => window.print()} disabled={disabled}>Print / Save PDF</Button>
    </div>
  );
}

function Panel({ state, children, skeleton = 6 }) {
  const { data, loading, error, reload } = state;
  if (loading && !data) return <div className="card space-y-2 p-4">{Array.from({ length: skeleton }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>;
  if (error && !data) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  return children;
}

const L = ({ label, children }) => <label className="text-xs font-medium text-muted">{label}<div className="mt-1">{children}</div></label>;
const Stat = ({ label, value, lime }) => (
  <div className={cx('rounded-3xl p-5', lime ? 'bg-accent text-accent-fg' : 'card')}>
    <p className={cx('text-xs', lime ? 'opacity-75' : 'text-muted')}>{label}</p>
    <p className="num mt-1 text-2xl font-medium">{value}</p>
  </div>
);

/* ---------------- Sales & profit ---------------- */
function SalesReport() {
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(toDateInput());
  const [month, setMonth] = useState(toDateInput().slice(0, 7));
  const [range, setRange] = useState({ from: daysAgo(30), to: toDateInput() });
  const state = useAsync(() => {
    if (period === 'daily') return reportService.daily(date);
    if (period === 'weekly') return reportService.weekly(date);
    if (period === 'monthly') return reportService.monthly(month);
    return reportService.custom(range.from, range.to);
  }, [period, date, month, range.from, range.to]);
  const d = state.data;

  const csv = () => downloadCsv(`sales-${period}.csv`, [
    { header: 'Period', value: (r) => r.label }, { header: 'Transactions', value: (r) => r.transactions }, { header: 'Pics sold', value: (r) => r.pics },
    { header: 'Revenue (NGN)', value: (r) => r.revenue }, { header: 'Profit (NGN)', value: (r) => r.profit },
  ], d.breakdown);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <L label="Report"><Select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="custom">Custom range</option></Select></L>
          {(period === 'daily' || period === 'weekly') && <L label={period === 'weekly' ? 'Week containing' : 'Date'}><Input type="date" value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} /></L>}
          {period === 'monthly' && <L label="Month"><Input type="month" value={month} max={toDateInput().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} /></L>}
          {period === 'custom' && <><L label="From"><Input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></L><L label="To"><Input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></L></>}
        </div>
        <ExportBar onCsv={csv} disabled={!d} />
      </div>
      <Panel state={state}>
        {d && (<>
          <p className="text-sm text-muted">{formatDate(d.period.from)} – {formatDate(d.period.to)}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Revenue (before tax)" value={formatNaira(d.summary.revenue)} />
            <Stat label="Cost of goods" value={formatNaira(d.summary.costOfGoods)} />
            <Stat lime label={`Gross profit · ${d.summary.marginPercent}% margin`} value={formatNaira(d.summary.grossProfit)} />
            <Stat label="Average order" value={formatNaira(d.summary.averageOrderValue)} />
            <Stat label="Transactions" value={formatNumber(d.summary.transactions)} />
            <Stat label="Pics sold" value={formatNumber(d.summary.picsSold)} />
          </div>
          <div className="card p-5"><h2 className="mb-3 text-lg font-medium">Revenue and profit</h2><RevenueBars data={d.breakdown} /></div>
          <div className="card overflow-hidden">
            <table className="w-full"><thead><tr className="bg-surface2"><th className="th">Period</th><th className="th text-right">Transactions</th><th className="th text-right">Pics</th><th className="th text-right">Revenue</th><th className="th text-right">Profit</th></tr></thead>
              <tbody>{d.breakdown.map((r) => <tr key={r.label} className="tr"><td className="td font-medium">{r.label}</td><td className="td num text-right">{r.transactions}</td><td className="td num text-right">{r.pics}</td><td className="td num text-right">{formatNaira(r.revenue)}</td><td className="td num text-right font-semibold">{formatNaira(r.profit)}</td></tr>)}</tbody>
            </table>
          </div>
        </>)}
      </Panel>
    </div>
  );
}

/* ---------------- Best sellers ---------------- */
function BestSellers() {
  const [range, setRange] = useState({ from: daysAgo(30), to: toDateInput() });
  const state = useAsync(() => reportService.bestSellers({ ...range, limit: 20 }), [range.from, range.to]);
  const rows = state.data?.data || [];
  const csv = () => downloadCsv('best-sellers.csv', [
    { header: 'Code', value: (r) => r.code }, { header: 'Material', value: (r) => r.name }, { header: 'Pics sold', value: (r) => r.picsSold },
    { header: 'Revenue (NGN)', value: (r) => r.revenue }, { header: 'Profit (NGN)', value: (r) => r.profit },
  ], rows);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex gap-3"><L label="From"><Input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></L><L label="To"><Input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></L></div>
        <ExportBar onCsv={csv} disabled={!rows.length} />
      </div>
      <Panel state={state}>
        <div className="card overflow-hidden">
          {!rows.length ? <EmptyState title="No sales in this period" /> : (
            <table className="w-full"><thead><tr className="bg-surface2"><th className="th">#</th><th className="th">Material</th><th className="th text-right">Pics sold</th><th className="th text-right">Revenue</th><th className="th text-right">Profit</th></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={r.productId} className="tr"><td className="td num text-muted">{i + 1}</td>
                  <td className="td"><div className="flex items-center gap-3"><FabricTile colors={r.colors} className="h-10 w-10 rounded-xl" /><div><p className="font-semibold">{r.name}</p><p className="num text-xs text-muted">{r.code}</p></div></div></td>
                  <td className="td num text-right">{r.picsSold}</td><td className="td num text-right">{formatNaira(r.revenue)}</td><td className="td num text-right font-semibold">{formatNaira(r.profit)}</td></tr>
              ))}</tbody></table>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Slow movers ---------------- */
function SlowMovers() {
  const [days, setDays] = useState(30);
  const state = useAsync(() => reportService.slowMovers({ days, limit: 50 }), [days]);
  const rows = state.data?.data || [];
  const csv = () => downloadCsv('slow-movers.csv', [
    { header: 'Code', value: (r) => r.code }, { header: 'Material', value: (r) => r.name }, { header: 'Pics in stock', value: (r) => r.stock },
    { header: `Pics sold (last ${days} days)`, value: (r) => r.picsSold }, { header: 'Last sold', value: (r) => r.lastSoldAt || 'Never' },
  ], rows);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <L label="Not selling in the last"><Select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days</option>)}</Select></L>
        <ExportBar onCsv={csv} disabled={!rows.length} />
      </div>
      <Panel state={state}>
        <div className="card overflow-hidden">
          {!rows.length ? <EmptyState title="Nothing is moving slowly" text="Every material with stock sold within this period." /> : (
            <table className="w-full"><thead><tr className="bg-surface2"><th className="th">Material</th><th className="th text-right">Pics in stock</th><th className="th text-right">Pics sold</th><th className="th">Last sold</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.productId} className="tr"><td className="td"><div className="flex items-center gap-3"><FabricTile colors={r.colors} className="h-10 w-10 rounded-xl" /><div><p className="font-semibold">{r.name}</p><p className="num text-xs text-muted">{r.code}</p></div></div></td>
                  <td className="td num text-right">{r.stock}</td><td className="td num text-right">{r.picsSold}</td><td className="td text-muted">{r.lastSoldAt ? formatDate(r.lastSoldAt) : 'Never'}</td></tr>
              ))}</tbody></table>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Inventory ---------------- */
function Inventory() {
  const state = useAsync(() => reportService.inventory(), []);
  const rows = state.data?.data || [];
  const t = state.data?.totals;
  const csv = () => downloadCsv('inventory.csv', [
    { header: 'Code', value: (r) => r.code }, { header: 'Material', value: (r) => r.name }, { header: 'Category', value: (r) => r.category },
    { header: 'Colours', value: (r) => r.colors.map((c) => c.name).join(' / ') }, { header: 'Pics', value: (r) => r.stock },
    { header: 'Cost (NGN)', value: (r) => r.costPrice }, { header: 'Price (NGN)', value: (r) => r.pricePerPic }, { header: 'Stock value at cost (NGN)', value: (r) => r.stock * r.costPrice },
  ], rows);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ExportBar onCsv={csv} disabled={!rows.length} /></div>
      <Panel state={state}>
        {t && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Materials" value={formatNumber(t.itemCount)} /><Stat label="Total pics" value={formatNumber(t.totalPics)} />
          <Stat label="Stock value at cost" value={formatNaira(t.stockValueCost)} /><Stat lime label="Stock value at selling price" value={formatNaira(t.stockValueRetail)} />
        </div>}
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px]"><thead><tr className="bg-surface2"><th className="th">Colour</th><th className="th">Material</th><th className="th">Category</th><th className="th text-right">Pics</th><th className="th text-right">Cost</th><th className="th text-right">Price</th><th className="th text-right">Value at cost</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="tr"><td className="td"><SwatchRow colors={r.colors} /></td><td className="td"><p className="font-semibold">{r.name}</p><p className="num text-xs text-muted">{r.code}</p></td><td className="td">{r.category}</td>
                <td className="td num text-right">{r.stock}</td><td className="td num text-right text-muted">{formatNaira(r.costPrice)}</td><td className="td num text-right">{formatNaira(r.pricePerPic)}</td><td className="td num text-right font-semibold">{formatNaira(r.stock * r.costPrice)}</td></tr>
            ))}</tbody></table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Cashier activity ---------------- */
function Activity() {
  const [f, setF] = useState({ from: daysAgo(14), to: toDateInput(), cashierId: '' });
  const [page, setPage] = useState(1);
  const cashiers = useAsync(() => cashierService.list(), []);
  const state = useAsync(() => reportService.activity({ ...f, page, limit: 20 }), [f.from, f.to, f.cashierId, page]);
  const rows = state.data?.data || [];
  const set = (p) => { setF({ ...f, ...p }); setPage(1); };
  const csv = () => downloadCsv('cashier-activity.csv', [
    { header: 'Cashier', value: (r) => r.cashier.name }, { header: 'Login', value: (r) => r.loginAt }, { header: 'Logout', value: (r) => r.logoutAt || 'Active' },
    { header: 'Duration (minutes)', value: (r) => r.durationMinutes ?? '' }, { header: 'Status', value: (r) => r.status },
  ], rows);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap gap-3">
          <L label="From"><Input type="date" value={f.from} max={f.to} onChange={(e) => set({ from: e.target.value })} /></L>
          <L label="To"><Input type="date" value={f.to} min={f.from} onChange={(e) => set({ to: e.target.value })} /></L>
          <L label="Cashier"><Select value={f.cashierId} onChange={(e) => set({ cashierId: e.target.value })}><option value="">All cashiers</option>{cashiers.data?.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></L>
        </div>
        <ExportBar onCsv={csv} disabled={!rows.length} />
      </div>
      <Panel state={state}>
        <div className="card overflow-hidden">
          {!rows.length ? <EmptyState title="No shifts in this period" /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead><tr className="bg-surface2"><th className="th">Cashier</th><th className="th">Login</th><th className="th">Logout</th><th className="th">Duration</th><th className="th">Status</th></tr></thead>
              <tbody>{rows.map((a) => <tr key={a.id} className="tr"><td className="td font-semibold">{a.cashier.name}</td><td className="td text-muted">{formatDateTime(a.loginAt)}</td><td className="td text-muted">{a.logoutAt ? formatDateTime(a.logoutAt) : '—'}</td><td className="td num">{formatDuration(a.durationMinutes)}</td><td className="td"><Badge tone={a.status === 'active' ? 'accent' : 'neutral'}>{a.status === 'active' ? 'Active' : 'Completed'}</Badge></td></tr>)}</tbody></table></div>
          )}
          <Pagination pagination={state.data?.pagination} onPage={setPage} />
        </div>
      </Panel>
    </div>
  );
}

const VIEWS = { sales: SalesReport, bestsellers: BestSellers, slowmovers: SlowMovers, inventory: Inventory, activity: Activity };

export default function Reports() {
  const [params, setParams] = useSearchParams();
  const tab = VIEWS[params.get('tab')] ? params.get('tab') : 'sales';
  const View = VIEWS[tab];
  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, profit, stock and staff activity." />
      <div className="mb-4 flex gap-1 overflow-x-auto print:hidden" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setParams({ tab: id })} className={cx('h-10 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition', tab === id ? 'bg-accent text-accent-fg' : 'bg-surface text-muted hover:text-ink')}>{label}</button>
        ))}
      </div>
      <View />
    </>
  );
}
