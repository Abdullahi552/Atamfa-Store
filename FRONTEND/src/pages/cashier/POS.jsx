import { useMemo, useState } from 'react';
import { Palmtree, Search, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/Feedback';
import { Swatch } from '@/components/common/Swatch';
import ProductCard from '@/components/pos/ProductCard';
import CartPanel from '@/components/pos/CartPanel';
import HeldCartsModal from '@/components/pos/HeldCartsModal';
import RecentOrders from '@/components/pos/RecentOrders';
import SaleModal from '@/components/sales/SaleModal';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAsync } from '@/hooks/useAsync';
import { productService } from '@/services/productService';
import { saleService } from '@/services/saleService';
import { CATEGORIES } from '@/lib/constants';
import { cx, formatNaira } from '@/lib/format';

export default function POS() {
  const cart = useCart();
  const toast = useToast();
  const { settings } = useSettings();
  const products = useAsync(() => productService.list({ limit: 500, status: 'active' }), []);
  const recent = useAsync(() => saleService.list({ limit: 5 }), []);
  const held = useAsync(() => saleService.listHeld(), []);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [colorFor, setColorFor] = useState(null);
  const [soldSale, setSoldSale] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);
  const [heldOpen, setHeldOpen] = useState(false);

  const list = products.data?.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)));
  }, [list, search, category]);

  const add = (product, color) => {
    const res = cart.addItem(product, color);
    if (!res.ok) toast.error(res.reason);
  };
  const onPick = (product) => {
    if (product.colors?.length > 1) setColorFor(product);
    else add(product, product.colors?.[0] || null);
  };

  // Barcode scanners type the code then press Enter.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return;
    const exact = list.find((p) => p.code.toLowerCase() === search.trim().toLowerCase());
    if (exact && exact.stock > 0) { onPick(exact); setSearch(''); }
  };

  const refreshAll = () => { products.reload(); recent.reload(); };

  return (
    <>
      {settings.vacationMode && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-gold/20 px-4 py-3 text-sm font-semibold text-gold"><Palmtree className="h-4 w-4" />Sales are paused. Vacation mode is on, so the Paid button is disabled.</div>
      )}
      <div className="grid gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="h-11 rounded-full bg-surface pl-11" placeholder="Search by name or code, or scan a barcode" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onSearchKey} aria-label="Search materials" />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {['', ...CATEGORIES].map((c) => (
                <button key={c || 'all'} onClick={() => setCategory(c)} className={cx('h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition', category === c ? 'bg-accent text-accent-fg' : 'bg-surface text-muted hover:text-ink')}>{c || 'All'}</button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {products.loading && !products.data ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}</div>
            ) : products.error ? <ErrorState error={products.error} onRetry={products.reload} />
              : !filtered.length ? <EmptyState icon={Search} title="No materials match" text="Try a different search or category." />
              : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} onPick={onPick} />)}
                </div>
              )}
          </div>

          <RecentOrders orders={recent.data?.data} onOpen={setOpenOrder} />
        </section>

        <CartPanel
          heldCount={held.data?.data?.length || 0}
          onOpenHeld={() => setHeldOpen(true)}
          onHeldChanged={held.reload}
          onSold={(sale) => { setSoldSale(sale); refreshAll(); }}
          onStockError={products.reload}
        />
      </div>

      <a href="#cart" className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-fg shadow-pop lg:hidden">
        <ShoppingCart className="h-4 w-4" /> {cart.totals.count} · {formatNaira(cart.totals.total)}
      </a>

      {colorFor && (
        <Modal onClose={() => setColorFor(null)} title="Which colour?" description={colorFor.name} size="sm">
          <div className="grid grid-cols-2 gap-2">
            {colorFor.colors.map((c) => (
              <button key={c.hex} onClick={() => { add(colorFor, c); setColorFor(null); }} className="tile flex items-center gap-3 p-3 text-left transition hover:ring-2 hover:ring-accent">
                <Swatch color={c} size={28} /><span className="text-sm font-semibold">{c.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {soldSale && <SaleModal sale={soldSale} onClose={() => setSoldSale(null)} />}
      {openOrder && <SaleModal saleId={openOrder.id} canRefund refundLabel="Mark as not paid" onClose={() => setOpenOrder(null)} onChanged={refreshAll} />}
      {heldOpen && <HeldCartsModal held={held.data?.data || []} products={list} onClose={() => setHeldOpen(false)} onChanged={held.reload} />}
    </>
  );
}
