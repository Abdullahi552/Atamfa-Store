import { useState } from 'react';
import { PauseCircle, Play, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { saleService } from '@/services/saleService';
import { formatDateTime } from '@/lib/format';

export default function HeldCartsModal({ held = [], products = [], onClose, onChanged }) {
  const cart = useCart();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  const resume = async (h) => {
    if (cart.items.length) return toast.error('Hold or clear the current order first.');
    const list = [];
    h.items.forEach((it) => {
      const p = products.find((x) => x.id === it.productId);
      if (!p || p.stock <= 0) return;
      list.push({ key: `${p.id}:${it.color?.hex || 'none'}`, productId: p.id, name: p.name, code: p.code, color: it.color || null, unitPrice: p.pricePerPic, stock: p.stock, quantity: Math.min(it.quantity, p.stock) });
    });
    if (!list.length) return toast.error('Those materials are no longer available.');
    setBusyId(h.id);
    try {
      await saleService.discardHeld(h.id);
      cart.replaceItems(list, h.discount ? { mode: h.discount.type, value: h.discount.value } : { mode: 'percent', value: 0 });
      onChanged();
      onClose();
    } catch (e) { toast.error(e.message); } finally { setBusyId(null); }
  };

  const discard = async (h) => {
    setBusyId(h.id);
    try { await saleService.discardHeld(h.id); onChanged(); } catch (e) { toast.error(e.message); } finally { setBusyId(null); }
  };

  return (
    <Modal onClose={onClose} title="Held orders" description="Orders you set aside to serve another customer.">
      {!held.length ? <EmptyState icon={PauseCircle} title="Nothing on hold" /> : (
        <ul className="space-y-2">
          {held.map((h) => (
            <li key={h.id} className="tile flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{h.items.map((i) => `${i.quantity}× ${i.name || 'item'}`).join(', ')}</p>
                <p className="text-xs text-muted">{formatDateTime(h.createdAt)}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="accent" icon={Play} loading={busyId === h.id} onClick={() => resume(h)}>Resume</Button>
                <Button size="sm" variant="outline" icon={Trash2} disabled={busyId === h.id} onClick={() => discard(h)} aria-label="Discard held order" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
