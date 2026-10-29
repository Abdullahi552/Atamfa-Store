import { useEffect, useState } from 'react';
import { Check, Minus, PauseCircle, Plus, ShoppingBag, Trash2, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Swatch } from '@/components/common/Swatch';
import Keypad from '@/components/pos/Keypad';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { saleService } from '@/services/saleService';
import { formatNaira, cx } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/constants';

export default function CartPanel({ onSold, onHeldChanged, onOpenHeld, heldCount, onStockError }) {
  const cart = useCart();
  const { items, totals, discount, setDiscount, paymentMethod, setPaymentMethod, selectedKey, setSelectedKey } = cart;
  const { settings } = useSettings();
  const toast = useToast();
  const [buffer, setBuffer] = useState('');
  const [tendered, setTendered] = useState('');
  const [paying, setPaying] = useState(false);
  const [holding, setHolding] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => setBuffer(''), [selectedKey]);

  const onKey = (k) => {
    if (!selectedKey) return;
    let next = buffer;
    if (k === 'C') next = '';
    else if (k === 'back') next = buffer.slice(0, -1);
    else next = (buffer + k).slice(0, 4);
    setBuffer(next);
    cart.setQuantity(selectedKey, parseInt(next, 10) || 1);
  };

  const payload = () => ({
    items: items.map((i) => ({ productId: i.productId, color: i.color, quantity: i.quantity })),
    // Never send more than the shop's maximum: if the cashier typed too much, send the capped amount.
    discount: totals.discountAmount <= 0 ? null
      : discount.mode === 'percent' && !totals.discountCapped ? { type: 'percent', value: Number(discount.value) }
      : { type: 'amount', value: totals.discountAmount },
  });

  const pay = async () => {
    if (!items.length) return;
    if (settings.vacationMode) return toast.error('Sales are paused (vacation mode is on).');
    if (paymentMethod === 'cash' && tendered && Number(tendered) < totals.total) return toast.error('Amount received is less than the total.');
    setPaying(true);
    try {
      const sale = await saleService.create({ ...payload(), paymentMethod, amountTendered: paymentMethod === 'cash' && tendered ? Number(tendered) : undefined });
      cart.clear();
      setTendered('');
      onSold(sale);
    } catch (e) {
      toast.error(e.message);
      if (e.code === 'INSUFFICIENT_STOCK') onStockError?.();
    } finally { setPaying(false); }
  };

  const hold = async () => {
    if (!items.length) return;
    setHolding(true);
    try {
      await saleService.hold(payload());
      cart.clear();
      toast.success('Cart held. Resume it any time from "Held".');
      onHeldChanged?.();
    } catch (e) { toast.error(e.message); } finally { setHolding(false); }
  };

  const change = tendered ? Number(tendered) - totals.total : 0;

  return (
    <aside id="cart" className="card flex flex-col gap-3 p-4 lg:h-full lg:min-h-0 lg:overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order <span className="num text-muted">· {totals.count} pics</span></h2>
        <Button variant="soft" size="sm" icon={PauseCircle} onClick={onOpenHeld}>Held{heldCount ? ` (${heldCount})` : ''}</Button>
      </div>

      <div className="min-h-[96px] flex-1 space-y-2 overflow-y-auto">
        {!items.length && (
          <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl bg-surface2 text-sm text-muted"><ShoppingBag className="h-6 w-6" />Tap a material to add it</div>
        )}
        {items.map((i) => (
          <div key={i.key} onClick={() => setSelectedKey(i.key)} className={cx('cursor-pointer rounded-2xl p-3 transition', selectedKey === i.key ? 'bg-accent/40 ring-2 ring-accent' : 'bg-surface2')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">{i.color && <><Swatch color={i.color} size={12} />{i.color.name} ·</>}<span className="num">{formatNaira(i.unitPrice)}</span></p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); cart.remove(i.key); }} aria-label={`Remove ${i.name}`} className="rounded-full p-1 text-muted hover:bg-line hover:text-rust"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-full bg-surface p-0.5">
                <button onClick={(e) => { e.stopPropagation(); cart.decrement(i.key); }} aria-label="Decrease" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface2"><Minus className="h-3.5 w-3.5" /></button>
                <span className="num w-8 text-center text-sm font-semibold">{i.quantity}</span>
                <button onClick={(e) => { e.stopPropagation(); cart.increment(i.key); }} aria-label="Increase" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface2"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <p className="num font-semibold">{formatNaira(i.unitPrice * i.quantity)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="tile space-y-1.5 p-3 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="num">{formatNaira(totals.subtotal)}</span></div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">Discount</span>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-full bg-surface p-0.5 text-xs font-semibold">
              {[['percent', '%'], ['amount', '₦']].map(([m, l]) => (
                <button key={m} onClick={() => setDiscount({ mode: m, value: discount.value })} className={cx('h-6 w-7 rounded-full', discount.mode === m ? 'bg-primary text-primary-fg' : 'text-muted')}>{l}</button>
              ))}
            </div>
            <Input type="number" min="0" inputMode="decimal" value={discount.value || ''} placeholder="0" onChange={(e) => setDiscount({ ...discount, value: e.target.value })} className="num h-8 w-20 rounded-full py-0 text-right" aria-label="Discount value" />
          </div>
        </div>
        {totals.discountCapped && <p className="text-xs text-rust">Capped at the shop maximum of {settings.maxDiscountPercent}%.</p>}
        {totals.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted">Discount applied</span><span className="num text-rust">-{formatNaira(totals.discountAmount)}</span></div>}
        <div className="flex justify-between"><span className="text-muted">Tax ({totals.taxRate}%)</span><span className="num">{formatNaira(totals.tax)}</span></div>
        <div className="flex items-baseline justify-between border-t border-line pt-2"><span className="font-semibold">Total</span><span className="num text-3xl font-semibold">{formatNaira(totals.total)}</span></div>
      </div>

      <div className="flex gap-1.5">
        {PAYMENT_METHODS.map((m) => (
          <button key={m.value} onClick={() => setPaymentMethod(m.value)} className={cx('h-9 flex-1 rounded-full text-sm font-semibold transition', paymentMethod === m.value ? 'bg-primary text-primary-fg' : 'bg-surface2 text-muted hover:text-ink')}>{m.label}</button>
        ))}
      </div>

      {paymentMethod === 'cash' && (
        <div className="flex items-center gap-2">
          <Input type="number" min="0" inputMode="decimal" placeholder="Amount received (optional)" value={tendered} onChange={(e) => setTendered(e.target.value)} className="num" aria-label="Amount received" />
          {tendered && <p className={cx('num whitespace-nowrap text-sm font-semibold', change < 0 ? 'text-rust' : 'text-ok')}>{change < 0 ? 'Short' : 'Change'} {formatNaira(Math.abs(change))}</p>}
        </div>
      )}

      <Keypad onKey={onKey} disabled={!selectedKey} />

      <div className="grid grid-cols-[auto_auto_1fr] gap-2">
        <Button variant="outline" size="lg" icon={PauseCircle} onClick={hold} loading={holding} disabled={!items.length} aria-label="Hold cart" className="px-4" />
        <Button variant="outline" size="lg" icon={XCircle} onClick={() => setConfirmCancel(true)} disabled={!items.length} className="px-4 text-rust">Refund</Button>
        <Button variant="accent" size="lg" icon={Check} onClick={pay} loading={paying} disabled={!items.length || settings.vacationMode}>Paid</Button>
      </div>

      <ConfirmDialog
        open={confirmCancel} danger title="Customer did not pay?" confirmLabel="Clear order"
        message="This cancels the order and clears the cart. No sale is recorded and stock is untouched."
        onClose={() => setConfirmCancel(false)} onConfirm={() => { cart.clear(); setTendered(''); setConfirmCancel(false); }}
      />
    </aside>
  );
}
