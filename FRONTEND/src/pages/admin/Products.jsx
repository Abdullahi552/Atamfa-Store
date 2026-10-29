import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, ArrowDown, ArrowUp, ArrowUpDown, Package, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Button, { IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import Pagination from '@/components/ui/Pagination';
import { SwatchRow } from '@/components/common/Swatch';
import { StockBadge } from '@/components/common/Badges';
import ProductFormModal from '@/pages/admin/ProductFormModal';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { productService } from '@/services/productService';
import { CATEGORIES, FABRIC_COLORS } from '@/lib/constants';
import { formatNaira } from '@/lib/format';

export default function Products() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ search: '', category: '', color: '', stockStatus: '', status: 'active' });
  const [sort, setSort] = useState({ sortBy: 'name', sortOrder: 'asc' });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | 'new' | product
  const [toArchive, setToArchive] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounce(filters.search);

  useEffect(() => { if (params.get('new')) { setForm('new'); setParams({}, { replace: true }); } }, [params, setParams]);

  const { data, loading, error, reload } = useAsync(
    () => productService.list({ ...filters, search, ...sort, page, limit: 12 }),
    [search, filters.category, filters.color, filters.stockStatus, filters.status, sort.sortBy, sort.sortOrder, page],
  );
  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const toggleSort = (sortBy) => { setSort((s) => ({ sortBy, sortOrder: s.sortBy === sortBy && s.sortOrder === 'asc' ? 'desc' : 'asc' })); setPage(1); };

  const SortTh = ({ field, children, className = '' }) => {
    const active = sort.sortBy === field;
    const Icon = !active ? ArrowUpDown : sort.sortOrder === 'asc' ? ArrowUp : ArrowDown;
    return <th className={`th ${className}`} aria-sort={active ? (sort.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}><button onClick={() => toggleSort(field)} className="inline-flex items-center gap-1 hover:text-ink">{children}<Icon className="h-3 w-3" /></button></th>;
  };

  const archive = async () => {
    setBusy(true);
    try { await productService.archive(toArchive.id); toast.success(`${toArchive.name} archived. It is hidden from the POS.`); setToArchive(null); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const restore = async (p) => {
    try { await productService.restore(p.id); toast.success(`${p.name} restored.`); reload(); } catch (e) { toast.error(e.message); }
  };

  const rows = data?.data || [];
  const hasFilters = filters.search || filters.category || filters.color || filters.stockStatus || filters.status !== 'active';

  return (
    <>
      <PageHeader title="Products" subtitle="Fabric materials sold by the pic." actions={<Button icon={Plus} onClick={() => setForm('new')}>Add material</Button>} />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-10" placeholder="Search name or code" value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} aria-label="Search products" />
          </div>
          <Select className="w-auto" value={filters.category} onChange={(e) => setFilter({ category: e.target.value })} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select className="w-auto" value={filters.color} onChange={(e) => setFilter({ color: e.target.value })} aria-label="Colour"><option value="">All colours</option>{FABRIC_COLORS.map((c) => <option key={c.hex}>{c.name}</option>)}</Select>
          <Select className="w-auto" value={filters.stockStatus} onChange={(e) => setFilter({ stockStatus: e.target.value })} aria-label="Stock level"><option value="">Any stock</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="out">Out of stock</option></Select>
          <Select className="w-auto" value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} aria-label="Status"><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></Select>
          {hasFilters && <Button variant="ghost" size="sm" onClick={() => setFilter({ search: '', category: '', color: '', stockStatus: '', status: 'active' })}>Clear</Button>}
        </div>

        {loading && !data ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : error ? <ErrorState error={error} onRetry={reload} />
          : !rows.length ? <EmptyState icon={Package} title="No materials found" text={hasFilters ? 'Try clearing some filters.' : 'Add your first material to get started.'} action={!hasFilters && <Button icon={Plus} onClick={() => setForm('new')}>Add material</Button>} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead><tr className="bg-surface2">
                  <th className="th">Colour</th><SortTh field="name">Material</SortTh><th className="th">Category</th>
                  <SortTh field="pricePerPic" className="text-right">Price / pic</SortTh><th className="th text-right">Cost</th>
                  <SortTh field="stock" className="text-right">Pics</SortTh><th className="th">Stock</th><th className="th text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className={`tr ${p.archived ? 'opacity-60' : ''}`}>
                      <td className="td"><SwatchRow colors={p.colors} /></td>
                      <td className="td"><p className="font-semibold">{p.name} {p.archived && <Badge className="ml-1">Archived</Badge>}</p><p className="num text-xs text-muted">{p.code}{p.materialType ? ` · ${p.materialType}` : ''}</p></td>
                      <td className="td">{p.category}</td>
                      <td className="td num text-right font-semibold">{formatNaira(p.pricePerPic)}</td>
                      <td className="td num text-right text-muted">{formatNaira(p.costPrice)}</td>
                      <td className="td num text-right">{p.stock}</td>
                      <td className="td"><StockBadge stock={p.stock} threshold={p.lowStockThreshold} /></td>
                      <td className="td"><div className="flex justify-end gap-1.5">
                        <IconButton icon={Pencil} label={`Edit ${p.name}`} className="h-9 w-9" onClick={() => setForm(p)} />
                        {p.archived ? <IconButton icon={RotateCcw} label={`Restore ${p.name}`} className="h-9 w-9" onClick={() => restore(p)} /> : <IconButton icon={Archive} label={`Archive ${p.name}`} className="h-9 w-9 hover:text-rust" onClick={() => setToArchive(p)} />}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>

      {form && <ProductFormModal product={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      <ConfirmDialog open={!!toArchive} danger title="Archive this material?" confirmLabel="Archive" loading={busy} message={`${toArchive?.name} will be hidden from the POS but kept in your records. You can restore it later.`} onClose={() => setToArchive(null)} onConfirm={archive} />
    </>
  );
}
