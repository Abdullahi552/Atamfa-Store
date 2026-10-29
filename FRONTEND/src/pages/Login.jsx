import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { FabricTile } from '@/components/common/Swatch';
import { homeFor } from '@/components/common/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { APP_NAME, USE_MOCK } from '@/config/env';

const SAMPLE = [
  [{ hex: '#2457C5' }, { hex: '#C9962B' }], [{ hex: '#E8812B' }, { hex: '#1F8A8A' }, { hex: '#F2D23C' }],
  [{ hex: '#5E1A3A' }], [{ hex: '#6A3AA8' }, { hex: '#E86FA3' }], [{ hex: '#F1E6CC' }, { hex: '#FFFFFF' }], [{ hex: '#1E8E5A' }],
];

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return setError('Enter your username and password.');
    setError('');
    setLoading(true);
    try { await login(form.username.trim(), form.password); } catch (err) { setError(err.status === 401 ? 'Wrong username or password.' : err.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-3 sm:p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-shell md:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-accent p-10 text-accent-fg md:flex">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center gap-[3px] rounded-2xl bg-primary"><i className="h-5 w-1.5 rounded-full bg-accent" /><i className="h-5 w-1.5 rounded-full bg-accent/60" /><i className="h-5 w-1.5 rounded-full bg-accent/30" /></span>
            <span className="font-display text-xl font-semibold">{APP_NAME}</span>
          </div>
          <div>
            <h1 className="text-5xl font-semibold leading-[1.05]">Every pic,<br />every naira,<br />accounted for.</h1>
            <p className="mt-4 max-w-xs text-sm opacity-80">Point of sale and stock control built for the Atamfa fabric trade.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SAMPLE.map((c, i) => <FabricTile key={i} colors={c} className="h-16" />)}
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-12">
          <form onSubmit={submit} className="w-full space-y-5" noValidate>
            <div>
              <h2 className="text-3xl font-semibold">Welcome back</h2>
              <p className="mt-1 text-sm text-muted">Sign in to continue. Your account decides what you see.</p>
            </div>
            {error && <p role="alert" className="rounded-2xl bg-rust/10 px-4 py-3 text-sm font-medium text-rust">{error}</p>}
            <Field label="Username" htmlFor="username">
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="username" autoComplete="username" autoFocus className="pl-10" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className="px-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading}>Sign in</Button>
            {USE_MOCK && (
              <p className="tile px-4 py-3 text-xs text-muted">
                <b className="text-ink">Demo mode</b> (no backend connected). Admin: <code>admin</code> / <code>admin123</code> · Cashier: <code>aisha</code> / <code>cashier123</code>
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
