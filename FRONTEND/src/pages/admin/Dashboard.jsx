import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Eye, EyeOff, LogIn, LogOut, Package, Plus, Receipt, ShoppingBag, TrendingUp, Undo2, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Badge, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { FabricTile } from '@/components/common/Swatch';
import { StockBadge } from '@/components/common/Badges';
import CountUp from '@/components/common/CountUp';
import { MonthlyBar, WeeklyLine } from '@/components/charts/TrendCharts';
import SaleModal from '@/components/sales/SaleModal';
import { useAsync } from '@/hooks/useAsync';
import { dashboardService } from '@/services/miscService';
import { formatDate, formatDateTime, formatDuration, formatNaira, formatNumber, formatTime } from '@/lib/format';

function CardHead({ icon: Icon, title, right }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line"><Icon className="h-[18px] w-[18px]" /></span>
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function BarRow({ label, amount, pct, lime, badge }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted"><span>{label}</span><span className="num">{amount}</span></div>
      <div className="relative mt-1.5 h-2.5 rounded-full bg-surface2">
        <div className={`h-full rounded-full ${lime ? 'bg-accent' : 'bg-line'}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
        {badge && <span className="num absolute top-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg" style={{ left: `${Math.max(14, Math.min(100, pct))}%`, transform: 'translate(-100%,-50%)' }}>{badge}</span>}
      </div>
    </div>
  );
}

const FEED_ICONS = { sale: Receipt, refund: Undo2, login: LogIn, logout: LogOut, stock: Package };

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => dashboardService.get(), []);
  const [hidden, setHidden] = useState(false);
  const [openSale, setOpenSale] = useState(null);

  useEffect(() => { const t = setInterval(() => reload(), 60000); return () => clearInterval(t); }, [reload]);

  if (loading && !data) {
    return <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={`h-64 rounded-3xl ${i < 2 ? 'lg:col-span-1' : ''}`} />)}</div>;
  }
  if (error && !data) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;

  const { stats, weeklyTrend, monthlyTrend, profitSummary: p, recentSales, lowStock, bestSellers, activityFeed, cashierActivity } = data;
  const money = (n) => (hidden ? '₦ ••••••' : formatNaira(n));
  const maxSold = Math.max(1, ...bestSellers.map((b) => b.picsSold));

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="card relative flex min-h-[260px] flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted">Today's sales</p>
            <span className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium">{formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <p className="num text-5xl font-medium tracking-tight sm:text-6xl"><CountUp value={stats.todaySales} format={money} /></p>
              <button onClick={() => setHidden((h) => !h)} aria-label={hidden ? 'Show amounts' : 'Hide amounts'} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-muted hover:text-ink">{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <p className="mt-2 text-sm text-muted">Average order <span className="num font-semibold text-ink">{money(stats.averageOrderValue)}</span></p>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button icon={Plus} onClick={() => navigate('/admin/products?new=1')}>Add material</Button>
              <Button variant="outline" icon={Receipt} onClick={() => navigate('/admin/sales')}>View sales</Button>
            </div>
            <Link to="/admin/reports" aria-label="Open reports" className="flex h-20 w-24 items-center justify-center rounded-[2rem] bg-accent text-accent-fg transition hover:brightness-95 sm:h-[72px] sm:w-[88px]"><ArrowUpRight className="h-7 w-7" /></Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-accent p-6 text-accent-fg">
          <svg className="pointer-events-none absolute -right-8 -top-8 h-52 w-52 opacity-25" viewBox="0 0 100 100" aria-hidden><path d="M50 0C54 30 70 46 100 50 70 54 54 70 50 100 46 70 30 54 0 50 30 46 46 30 50 0Z" fill="#fff" /></svg>
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-accent"><TrendingUp className="h-4 w-4" />Profit today</span>
          </div>
          <p className="relative mt-6 text-sm opacity-75">Gross profit</p>
          <div className="relative flex flex-wrap items-center gap-3">
            <p className="num text-5xl font-medium tracking-tight"><CountUp value={stats.grossProfit} format={money} /></p>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-ok">{p.marginPercent}% margin</span>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/45 p-3.5"><p className="flex items-center gap-1.5 text-xs opacity-75"><ShoppingBag className="h-3.5 w-3.5" />Transactions</p><p className="num mt-1 text-2xl font-medium">{formatNumber(stats.transactions)}</p></div>
            <div className="rounded-2xl bg-white/45 p-3.5"><p className="flex items-center gap-1.5 text-xs opacity-75"><AlertTriangle className="h-3.5 w-3.5" />Low stock items</p><p className="num mt-1 text-2xl font-medium">{formatNumber(stats.lowStockCount)}</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <CardHead icon={BarChart3} title="Weekly sales" right={<Badge className="px-3 py-1.5">Pics, last 7 days</Badge>} />
          <WeeklyLine data={weeklyTrend} />
        </div>

        <div className="card p-5">
          <CardHead icon={TrendingUp} title="Profit summary" right={<Badge tone="dark" className="px-3 py-1.5">Today</Badge>} />
          <p className="num text-4xl font-medium">{money(p.revenue)}</p>
          <p className="mt-1 text-xs text-muted">Revenue before tax</p>
          <div className="mt-6 space-y-5">
            <BarRow label="Revenue" amount={money(p.revenue)} pct={100} />
            <BarRow label="Cost of goods" amount={money(p.costOfGoods)} pct={p.revenue ? (p.costOfGoods / p.revenue) * 100 : 0} />
            <BarRow label="Gross profit" amount={money(p.grossProfit)} pct={p.revenue ? (p.grossProfit / p.revenue) * 100 : 0} lime badge={`${p.marginPercent}%`} />
          </div>
        </div>

        <div className="card p-5">
          <CardHead icon={Receipt} title="Recent sales" right={<Link to="/admin/sales" className="text-xs font-semibold text-muted hover:text-ink">View all</Link>} />
          {!recentSales.length ? <p className="py-10 text-center text-sm text-muted">No sales yet today.</p> : (
            <ul className="divide-y divide-line">
              {recentSales.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setOpenSale(s)} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2"><Receipt className="h-4 w-4 text-muted" /></span>
                    <span className="min-w-0 flex-1"><span className="num block truncate text-sm font-semibold">{s.receiptNumber}</span><span className="block truncate text-xs text-muted">{s.cashier?.name} · {formatTime(s.createdAt)}</span></span>
                    <span className={`num text-sm font-semibold ${s.status === 'refunded' ? 'text-rust' : 'text-ok'}`}>{s.status === 'refunded' ? '-' : '+'}{money(s.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <CardHead icon={BarChart3} title="Monthly sales" right={<Badge className="px-3 py-1.5">Last 6 months</Badge>} />
          <MonthlyBar data={monthlyTrend} />
        </div>

        <div className="card p-5">
          <CardHead icon={TrendingUp} title="Best selling" />
          {!bestSellers.length ? <p className="py-10 text-center text-sm text-muted">No sales data yet.</p> : (
            <ul className="space-y-4">
              {bestSellers.map((b) => (
                <li key={b.productId} className="flex items-center gap-3">
                  <FabricTile colors={b.colors} className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm"><span className="truncate font-semibold">{b.name}</span><span className="num shrink-0 text-muted">{b.picsSold} pics</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-surface2"><div className="h-full rounded-full bg-accent" style={{ width: `${(b.picsSold / maxSold) * 100}%` }} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <CardHead icon={AlertTriangle} title="Low stock alerts" right={<Badge tone={lowStock.length ? 'danger' : 'ok'} className="px-3 py-1.5">{lowStock.length} items</Badge>} />
          {!lowStock.length ? <p className="py-10 text-center text-sm text-muted">Everything is well stocked.</p> : (
            <ul className="divide-y divide-line">
              {lowStock.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5">
                  <FabricTile colors={i.colors} className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.name}</p><p className="num text-xs text-muted">{i.code} · {i.stock} pics left</p></div>
                  <StockBadge stock={i.stock} threshold={i.lowStockThreshold} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <CardHead icon={Users} title="Cashier activity" right={<Link to="/admin/reports?tab=activity" className="text-xs font-semibold text-muted hover:text-ink">Full log</Link>} />
          {!cashierActivity.length ? <p className="py-8 text-center text-sm text-muted">No shifts recorded yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead><tr><th className="th pl-0">Cashier</th><th className="th">Login</th><th className="th">Logout</th><th className="th">Duration</th><th className="th">Status</th></tr></thead>
                <tbody>
                  {cashierActivity.map((a) => (
                    <tr key={a.id} className="tr">
                      <td className="td pl-0 font-semibold">{a.cashier.name}</td>
                      <td className="td text-muted">{formatDateTime(a.loginAt)}</td>
                      <td className="td text-muted">{a.logoutAt ? formatDateTime(a.logoutAt) : '—'}</td>
                      <td className="td num">{formatDuration(a.durationMinutes)}</td>
                      <td className="td"><Badge tone={a.status === 'active' ? 'accent' : 'neutral'}>{a.status === 'active' ? 'Active' : 'Completed'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <CardHead icon={Activity} title="Activity feed" />
          {!activityFeed.length ? <p className="py-8 text-center text-sm text-muted">Nothing yet.</p> : (
            <ul className="space-y-3">
              {activityFeed.map((a) => {
                const Icon = FEED_ICONS[a.type] || Activity;
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2"><Icon className="h-4 w-4 text-muted" /></span>
                    <div className="min-w-0"><p className="text-sm">{a.message}</p><p className="text-xs text-muted">{formatDateTime(a.createdAt)}</p></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {openSale && <SaleModal saleId={openSale.id} canRefund onClose={() => setOpenSale(null)} onChanged={reload} />}
    </div>
  );
}
