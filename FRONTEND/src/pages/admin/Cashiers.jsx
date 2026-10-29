import { useState } from 'react';
import { Check, Copy, KeyRound, Pencil, Plus, RefreshCw, UserCheck, UserX, Users } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Avatar from '@/components/common/Avatar';
import Button, { IconButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { cashierService } from '@/services/cashierService';
import { formatDate, formatNaira } from '@/lib/format';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function CashierForm({ cashier, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(cashier);
  const [f, setF] = useState({ name: cashier?.name || '', username: cashier?.username || '', password: editing ? '' : generatePassword() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Enter the full name.';
    if (!/^[a-z0-9._-]{3,}$/i.test(f.username.trim())) er.username = 'At least 3 characters: letters, numbers, . _ -';
    if (!editing && f.password.length < 8) er.password = 'At least 8 characters.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try {
      const body = { name: f.name.trim(), username: f.username.trim().toLowerCase() };
      if (editing) { await cashierService.update(cashier.id, body); toast.success('Cashier updated.'); onSaved(); }
      else { await cashierService.create({ ...body, password: f.password }); toast.success('Cashier registered.'); onSaved({ username: body.username, password: f.password }); }
    } catch (err) { if (err.errors) setErrors(err.errors); else toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} size="sm" title={editing ? 'Edit cashier' : 'Register cashier'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" form="cashier-form" loading={saving}>{editing ? 'Save' : 'Register'}</Button></>}>
      <form id="cashier-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} autoFocus /></Field>
        <Field label="Username" error={errors.username} hint="Used to sign in. Must be unique."><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} invalid={!!errors.username} autoCapitalize="none" /></Field>
        {!editing && (
          <Field label="Temporary password" error={errors.password} hint="Share it with the cashier. They can change it after signing in.">
            <div className="flex gap-2"><Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} invalid={!!errors.password} className="font-mono" /><IconButton icon={RefreshCw} label="Generate password" onClick={() => setF({ ...f, password: generatePassword() })} /></div>
          </Field>
        )}
      </form>
    </Modal>
  );
}

function PasswordReveal({ info, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(info.password); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } };
  return (
    <Modal onClose={onClose} size="sm" title="Temporary password" description={`For ${info.username}. It will not be shown again.`} footer={<Button onClick={onClose}>Done</Button>}>
      <div className="tile flex items-center justify-between gap-3 p-4">
        <code className="font-mono text-xl font-semibold tracking-wider">{info.password}</code>
        <Button variant="outline" size="sm" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>
    </Modal>
  );
}

export default function Cashiers() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => cashierService.list(), []);
  const [form, setForm] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, cashier }
  const [busy, setBusy] = useState(false);
  const rows = data?.data || [];

  const run = async () => {
    const { type, cashier } = confirm;
    setBusy(true);
    try {
      if (type === 'deactivate') { await cashierService.deactivate(cashier.id); toast.success(`${cashier.name} can no longer sign in.`); }
      if (type === 'activate') { await cashierService.update(cashier.id, { active: true }); toast.success(`${cashier.name} reactivated.`); }
      if (type === 'reset') { const r = await cashierService.resetPassword(cashier.id); setReveal({ username: cashier.username, password: r.tempPassword }); }
      setConfirm(null); reload();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const CONFIRM = {
    deactivate: { title: 'Remove this cashier?', label: 'Remove', danger: true, text: (c) => `${c.name} will be blocked from signing in immediately. Their sales history stays.` },
    activate: { title: 'Reactivate cashier?', label: 'Reactivate', text: (c) => `${c.name} will be able to sign in again.` },
    reset: { title: 'Reset password?', label: 'Generate new password', text: (c) => `A new temporary password will be created for ${c.name}. The old one stops working.` },
  };

  return (
    <>
      <PageHeader title="Cashiers" subtitle="Register staff and see how each one is performing." actions={<Button icon={Plus} onClick={() => setForm('new')}>Register cashier</Button>} />
      <div className="card overflow-hidden">
        {loading && !data ? <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          : error ? <ErrorState error={error} onRetry={reload} />
          : !rows.length ? <EmptyState icon={Users} title="No cashiers yet" text="Register a cashier so they can start selling." action={<Button icon={Plus} onClick={() => setForm('new')}>Register cashier</Button>} />
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead><tr className="bg-surface2"><th className="th">Cashier</th><th className="th">Status</th><th className="th text-right">Today</th><th className="th text-right">This week</th><th className="th text-right">This month</th><th className="th text-right">Overall</th><th className="th text-right">Actions</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className={`tr ${c.active ? '' : 'opacity-60'}`}>
                      <td className="td"><div className="flex items-center gap-3"><Avatar user={c} size={38} /><div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted">@{c.username} · since {formatDate(c.createdAt, { month: 'short', year: 'numeric' })}</p></div></div></td>
                      <td className="td"><Badge tone={c.active ? 'ok' : 'neutral'}>{c.active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="td num text-right">{formatNaira(c.stats.today)}</td>
                      <td className="td num text-right">{formatNaira(c.stats.week)}</td>
                      <td className="td num text-right">{formatNaira(c.stats.month)}</td>
                      <td className="td num text-right font-semibold">{formatNaira(c.stats.overall)}</td>
                      <td className="td"><div className="flex justify-end gap-1.5">
                        <IconButton icon={Pencil} label={`Edit ${c.name}`} className="h-9 w-9" onClick={() => setForm(c)} />
                        <IconButton icon={KeyRound} label={`Reset password for ${c.name}`} className="h-9 w-9" onClick={() => setConfirm({ type: 'reset', cashier: c })} />
                        {c.active ? <IconButton icon={UserX} label={`Remove ${c.name}`} className="h-9 w-9 hover:text-rust" onClick={() => setConfirm({ type: 'deactivate', cashier: c })} /> : <IconButton icon={UserCheck} label={`Reactivate ${c.name}`} className="h-9 w-9" onClick={() => setConfirm({ type: 'activate', cashier: c })} />}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {form && <CashierForm cashier={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={(creds) => { setForm(null); reload(); if (creds) setReveal(creds); }} />}
      {reveal && <PasswordReveal info={reveal} onClose={() => setReveal(null)} />}
      {confirm && <ConfirmDialog open danger={CONFIRM[confirm.type].danger} title={CONFIRM[confirm.type].title} confirmLabel={CONFIRM[confirm.type].label} message={CONFIRM[confirm.type].text(confirm.cashier)} loading={busy} onClose={() => setConfirm(null)} onConfirm={run} />}
    </>
  );
}
