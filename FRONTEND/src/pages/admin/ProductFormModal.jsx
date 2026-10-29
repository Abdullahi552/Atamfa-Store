import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import ColorPicker from '@/components/common/ColorPicker';
import { FabricTile } from '@/components/common/Swatch';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { productService } from '@/services/productService';
import { CATEGORIES, MATERIAL_TYPES, SIZES } from '@/lib/constants';
import { cx, formatNaira } from '@/lib/format';

export default function ProductFormModal({ product, onClose, onSaved }) {
  const { settings } = useSettings();
  const toast = useToast();
  const editing = Boolean(product);
  const [f, setF] = useState(() => ({
    name: product?.name || '',
    code: product?.code || '',
    category: product?.category || CATEGORIES[0],
    colors: product?.colors || [],
    sizes: product?.sizes || [],
    pricePerPic: product?.pricePerPic ?? '',
    costPrice: product?.costPrice ?? '',
    stock: product?.stock ?? '',
    lowStockThreshold: product?.lowStockThreshold ?? settings.lowStockThreshold,
    materialType: product?.materialType || '',
    description: product?.description || '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Enter the material name.';
    if (!f.code.trim()) e.code = 'Enter a unique code.';
    else if (!/^[A-Za-z0-9_-]+$/.test(f.code.trim())) e.code = 'Letters, numbers, - and _ only.';
    if (!f.colors.length) e.colors = 'Choose at least one colour.';
    if (!(Number(f.pricePerPic) > 0)) e.pricePerPic = 'Enter a selling price above 0.';
    if (f.costPrice === '' || Number(f.costPrice) < 0) e.costPrice = 'Enter the cost price.';
    if (!Number.isInteger(Number(f.stock)) || f.stock === '' || Number(f.stock) < 0) e.stock = 'Whole number, 0 or more.';
    if (!Number.isInteger(Number(f.lowStockThreshold)) || Number(f.lowStockThreshold) < 0) e.lowStockThreshold = 'Whole number, 0 or more.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const body = {
      name: f.name.trim(), code: f.code.trim().toUpperCase(), category: f.category, colors: f.colors, sizes: f.sizes,
      pricePerPic: Number(f.pricePerPic), costPrice: Number(f.costPrice), stock: Number(f.stock), lowStockThreshold: Number(f.lowStockThreshold),
      materialType: f.materialType || null, description: f.description.trim() || null,
    };
    try {
      const saved = editing ? await productService.update(product.id, body) : await productService.create(body);
      toast.success(editing ? 'Material updated.' : 'Material added.');
      onSaved(saved);
    } catch (err) {
      if (err.errors) setErrors(err.errors); else toast.error(err.message);
    } finally { setSaving(false); }
  };

  const marginWarn = Number(f.pricePerPic) > 0 && f.costPrice !== '' && Number(f.pricePerPic) < Number(f.costPrice);

  return (
    <Modal
      onClose={onClose} size="lg" title={editing ? 'Edit material' : 'Add new material'} description="Pick the colour of the cloth instead of uploading a photo."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="product-form" loading={saving}>{editing ? 'Save changes' : 'Add material'}</Button></>}
    >
      <form id="product-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex items-center gap-4 rounded-2xl bg-surface2 p-3">
          <FabricTile colors={f.colors} className="h-16 w-24 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{f.name || 'New material'}</p>
            <p className="num text-sm text-muted">{f.code || 'CODE'} · {f.pricePerPic ? formatNaira(f.pricePerPic) : '₦0'} per pic</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Atamfa Turmi Premium" invalid={!!errors.name} autoFocus /></Field>
          <Field label="Code" error={errors.code}><Input value={f.code} onChange={(e) => set({ code: e.target.value })} placeholder="TUR-001" invalid={!!errors.code} className="uppercase" /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        </div>

        <Field label="Cloth colour(s)" error={errors.colors} hint="Cashiers choose among these colours when selling.">
          <ColorPicker value={f.colors} onChange={(colors) => set({ colors })} invalid={!!errors.colors} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price per pic (₦)" error={errors.pricePerPic}><Input type="number" min="0" inputMode="decimal" value={f.pricePerPic} onChange={(e) => set({ pricePerPic: e.target.value })} invalid={!!errors.pricePerPic} className="num" /></Field>
          <Field label="Cost price (₦)" error={errors.costPrice} hint={marginWarn ? 'Selling price is below cost.' : 'Used for profit reports.'}><Input type="number" min="0" inputMode="decimal" value={f.costPrice} onChange={(e) => set({ costPrice: e.target.value })} invalid={!!errors.costPrice} className={cx('num', marginWarn && 'border-gold')} /></Field>
          <Field label="Available pics" error={errors.stock}><Input type="number" min="0" inputMode="numeric" value={f.stock} onChange={(e) => set({ stock: e.target.value })} invalid={!!errors.stock} className="num" /></Field>
          <Field label="Low-stock alert at" error={errors.lowStockThreshold} hint="Alert when stock falls to this many pics."><Input type="number" min="0" inputMode="numeric" value={f.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: e.target.value })} invalid={!!errors.lowStockThreshold} className="num" /></Field>
          <Field label="Material type"><Input list="material-types" value={f.materialType} onChange={(e) => set({ materialType: e.target.value })} placeholder="100% Cotton" /><datalist id="material-types">{MATERIAL_TYPES.map((m) => <option key={m} value={m} />)}</datalist></Field>
          <Field label="Sizes (optional)">
            <div className="flex gap-1.5">
              {SIZES.map((s) => {
                const on = f.sizes.includes(s);
                return <button key={s} type="button" onClick={() => set({ sizes: on ? f.sizes.filter((x) => x !== s) : [...f.sizes, s] })} aria-pressed={on} className={cx('h-10 flex-1 rounded-xl text-sm font-semibold transition', on ? 'bg-primary text-primary-fg' : 'bg-surface2 text-muted hover:text-ink')}>{s}</button>;
              })}
            </div>
          </Field>
        </div>
        <Field label="Description (optional)"><Textarea value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Origin, quality, notes" /></Field>
      </form>
    </Modal>
  );
}
