import { useRef, useState } from 'react';
import { Camera, KeyRound, Palmtree } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Avatar from '@/components/common/Avatar';
import ProfileModal from '@/components/common/ProfileModal';
import Button from '@/components/ui/Button';
import { Field, Input, Switch, Textarea } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/services/authService';
import { settingsService } from '@/services/miscService';
import { assetUrl } from '@/config/env';
import { initials } from '@/lib/format';

function ShopSettings() {
  const { settings, setSettings } = useSettings();
  const toast = useToast();
  const fileRef = useRef(null);
  const [f, setF] = useState({
    shopName: settings.shopName, shopAddress: settings.shopAddress || '', shopPhone: settings.shopPhone || '', taxRate: settings.taxRate,
    maxDiscountPercent: settings.maxDiscountPercent, lowStockThreshold: settings.lowStockThreshold, receiptFooter: settings.receiptFooter || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [vacBusy, setVacBusy] = useState(false);
  const set = (patch) => setF((p) => ({ ...p, ...patch }));

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.shopName.trim()) er.shopName = 'Enter the shop name.';
    if (f.taxRate === '' || Number(f.taxRate) < 0 || Number(f.taxRate) > 100) er.taxRate = 'Between 0 and 100.';
    if (f.maxDiscountPercent === '' || Number(f.maxDiscountPercent) < 0 || Number(f.maxDiscountPercent) > 100) er.maxDiscountPercent = 'Between 0 and 100.';
    if (!Number.isInteger(Number(f.lowStockThreshold)) || Number(f.lowStockThreshold) < 0) er.lowStockThreshold = 'Whole number, 0 or more.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try {
      const saved = await settingsService.update({ ...f, shopName: f.shopName.trim(), taxRate: Number(f.taxRate), maxDiscountPercent: Number(f.maxDiscountPercent), lowStockThreshold: Number(f.lowStockThreshold) });
      setSettings(saved);
      toast.success('Shop settings saved.');
    } catch (err) { if (err.errors) setErrors(err.errors); else toast.error(err.message); } finally { setSaving(false); }
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be 2 MB or smaller.');
    setLogoBusy(true);
    try { const { shopLogoUrl } = await settingsService.uploadLogo(file); setSettings({ shopLogoUrl }); toast.success('Logo updated.'); } catch (err) { toast.error(err.message); } finally { setLogoBusy(false); }
  };

  const toggleVacation = async (on) => {
    setVacBusy(true);
    try { const saved = await settingsService.update({ vacationMode: on }); setSettings(saved); toast.success(on ? 'Vacation mode on. Sales are paused.' : 'Vacation mode off. Sales are open.'); } catch (err) { toast.error(err.message); } finally { setVacBusy(false); }
  };

  const logo = assetUrl(settings.shopLogoUrl);
  return (
    <div className="space-y-4">
      <form onSubmit={save} className="card space-y-5 p-6" noValidate>
        <h2 className="text-xl font-medium">Shop</h2>
        <div className="flex items-center gap-4">
          {logo ? <img src={logo} alt="" className="h-16 w-16 rounded-2xl object-contain ring-1 ring-line" /> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent font-display text-xl font-semibold text-accent-fg">{initials(f.shopName)}</span>}
          <div><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} /><Button variant="outline" icon={Camera} loading={logoBusy} onClick={() => fileRef.current?.click()}>Upload logo</Button><p className="mt-1 text-xs text-muted">Appears on receipts. PNG or JPG, up to 2 MB.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" error={errors.shopName}><Input value={f.shopName} onChange={(e) => set({ shopName: e.target.value })} invalid={!!errors.shopName} /></Field>
          <Field label="Phone"><Input value={f.shopPhone} onChange={(e) => set({ shopPhone: e.target.value })} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input value={f.shopAddress} onChange={(e) => set({ shopAddress: e.target.value })} /></Field>
          <Field label="Tax rate (%)" error={errors.taxRate} hint="Added to every sale."><Input type="number" step="0.01" min="0" value={f.taxRate} onChange={(e) => set({ taxRate: e.target.value })} invalid={!!errors.taxRate} className="num" /></Field>
          <Field label="Maximum discount (%)" error={errors.maxDiscountPercent} hint="Cashiers cannot give more than this."><Input type="number" step="0.01" min="0" value={f.maxDiscountPercent} onChange={(e) => set({ maxDiscountPercent: e.target.value })} invalid={!!errors.maxDiscountPercent} className="num" /></Field>
          <Field label="Default low-stock level (pics)" error={errors.lowStockThreshold} hint="Pre-fills new materials."><Input type="number" min="0" value={f.lowStockThreshold} onChange={(e) => set({ lowStockThreshold: e.target.value })} invalid={!!errors.lowStockThreshold} className="num" /></Field>
          <Field label="Receipt footer" className="sm:col-span-2"><Textarea value={f.receiptFooter} onChange={(e) => set({ receiptFooter: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end"><Button type="submit" loading={saving}>Save shop settings</Button></div>
      </form>

      <div className="card flex items-center justify-between gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold"><Palmtree className="h-5 w-5" /></span>
          <div><h2 className="text-lg font-medium">Vacation mode</h2><p className="text-sm text-muted">Pauses selling at every till. Reports and stock stay available.</p></div>
        </div>
        <Switch checked={!!settings.vacationMode} onChange={toggleVacation} label="Vacation mode" disabled={vacBusy} />
      </div>
    </div>
  );
}

function Account() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, username: user.username, email: user.email || '', phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Enter your name.';
    if (!/^[a-z0-9._-]{3,}$/i.test(f.username.trim())) er.username = 'At least 3 characters: letters, numbers, . _ -';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try { updateUser(await authService.updateProfile({ ...f, name: f.name.trim(), username: f.username.trim() })); toast.success('Account updated.'); } catch (err) { if (err.errors) setErrors(err.errors); else toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <>
      <form onSubmit={save} className="card space-y-5 p-6" noValidate>
        <h2 className="text-xl font-medium">Your account</h2>
        <div className="flex items-center gap-4"><Avatar user={user} size={64} /><div className="flex flex-wrap gap-2"><Button variant="outline" icon={Camera} onClick={() => setModal('profile')}>Change picture</Button><Button variant="outline" icon={KeyRound} onClick={() => setModal('password')}>Change password</Button></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} /></Field>
          <Field label="Username" error={errors.username}><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} invalid={!!errors.username} autoCapitalize="none" /></Field>
          <Field label="Email" error={errors.email}><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={!!errors.email} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end"><Button type="submit" loading={saving}>Save account</Button></div>
      </form>
      {modal && <ProfileModal initialTab={modal} onClose={() => setModal(null)} />}
    </>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Shop rules, receipts and your own account." />
      <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]"><ShopSettings /><Account /></div>
    </>
  );
}
