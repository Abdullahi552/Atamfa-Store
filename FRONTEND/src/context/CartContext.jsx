import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { round2 } from '@/lib/format';

const CartCtx = createContext(null);
export const cartKey = (productId, color) => `${productId}:${color?.hex || 'none'}`;

export function CartProvider({ children }) {
  const { settings } = useSettings();
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState({ mode: 'percent', value: 0 });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedKey, setSelectedKey] = useState(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  /** Quantity of a product across all colours already in the cart (stock is tracked per product). */
  const inCart = useCallback((productId, exceptKey) => itemsRef.current
    .filter((i) => i.productId === productId && i.key !== exceptKey)
    .reduce((s, i) => s + i.quantity, 0), []);

  const addItem = useCallback((product, color) => {
    const key = cartKey(product.id, color);
    const current = itemsRef.current;
    if (inCart(product.id) >= product.stock) return { ok: false, reason: 'Not enough stock for this material.' };
    const existing = current.find((i) => i.key === key);
    setItems(existing
      ? current.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1, stock: product.stock } : i))
      : [...current, { key, productId: product.id, name: product.name, code: product.code, color: color || null, unitPrice: product.pricePerPic, stock: product.stock, quantity: 1 }]);
    setSelectedKey(key);
    return { ok: true };
  }, [inCart]);

  const setQuantity = useCallback((key, qty) => {
    const item = itemsRef.current.find((i) => i.key === key);
    if (!item) return;
    const max = Math.max(1, item.stock - inCart(item.productId, key));
    const next = Math.min(Math.max(1, Math.floor(Number(qty) || 1)), max);
    setItems((list) => list.map((i) => (i.key === key ? { ...i, quantity: next } : i)));
  }, [inCart]);

  const increment = useCallback((key) => { const i = itemsRef.current.find((x) => x.key === key); if (i) setQuantity(key, i.quantity + 1); }, [setQuantity]);
  const decrement = useCallback((key) => { const i = itemsRef.current.find((x) => x.key === key); if (i) setQuantity(key, i.quantity - 1); }, [setQuantity]);
  const remove = useCallback((key) => { setItems((l) => l.filter((i) => i.key !== key)); setSelectedKey((k) => (k === key ? null : k)); }, []);
  const clear = useCallback(() => { setItems([]); setDiscount({ mode: 'percent', value: 0 }); setSelectedKey(null); }, []);
  const replaceItems = useCallback((list, disc) => { setItems(list); if (disc) setDiscount(disc); setSelectedKey(null); }, []);

  /**
   * Totals. The backend MUST use the same formula (see docs/BACKEND_API_CONTRACT.md):
   *   discount = min(percent|amount discount, subtotal * maxDiscountPercent / 100)
   *   tax      = round2((subtotal - discount) * taxRate / 100)
   *   total    = (subtotal - discount) + tax
   */
  const totals = useMemo(() => {
    const subtotal = round2(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
    const maxDiscount = round2((subtotal * (settings.maxDiscountPercent ?? 100)) / 100);
    const raw = discount.mode === 'percent' ? (subtotal * (Number(discount.value) || 0)) / 100 : Number(discount.value) || 0;
    const discountAmount = round2(Math.min(raw, maxDiscount, subtotal));
    const taxable = round2(subtotal - discountAmount);
    const tax = round2((taxable * (settings.taxRate || 0)) / 100);
    return { subtotal, discountAmount, discountCapped: raw > maxDiscount + 0.001, tax, taxRate: settings.taxRate || 0, total: round2(taxable + tax), count: items.reduce((s, i) => s + i.quantity, 0) };
  }, [items, discount, settings.maxDiscountPercent, settings.taxRate]);

  const value = useMemo(() => ({
    items, discount, setDiscount, paymentMethod, setPaymentMethod, selectedKey, setSelectedKey,
    addItem, setQuantity, increment, decrement, remove, clear, replaceItems, totals,
  }), [items, discount, paymentMethod, selectedKey, addItem, setQuantity, increment, decrement, remove, clear, replaceItems, totals]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);
