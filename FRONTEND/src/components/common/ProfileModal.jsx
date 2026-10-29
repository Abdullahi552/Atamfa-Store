import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import Avatar from '@/components/common/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/services/authService';
import { cx } from '@/lib/format';

/** "My profile": change picture + change password. Used by admin and cashier. */
export default function ProfileModal({ onClose, initialTab = 'profile' }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState(initialTab);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.');
    if (file.size > 2 * 1024 * 1024) return toast.error('Picture must be 2 MB or smaller.');
    setUploading(true);
    try {
      const { avatarUrl } = await authService.uploadAvatar(file);
      updateUser({ avatarUrl });
      toast.success('Profile picture updated.');
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    const next = {};
    if (!pw.current) next.current = 'Enter your current password.';
    if (pw.next.length < 8) next.next = 'Use at least 8 characters.';
    if (pw.next !== pw.confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await authService.changePassword(pw.current, pw.next);
      toast.success('Password changed.');
      onClose();
    } catch (err) {
      setErrors(err.errors || { current: err.message });
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} title="My profile" size="sm">
      <div className="mb-5 flex rounded-full bg-surface2 p-1">
        {[['profile', 'Picture'], ['password', 'Password']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={cx('flex-1 rounded-full py-2 text-sm font-semibold transition', tab === id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink')}>{label}</button>
        ))}
      </div>

      {tab === 'profile' ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Avatar user={user} size={96} />
          <div>
            <p className="font-display text-lg font-semibold">{user.name}</p>
            <p className="text-sm capitalize text-muted">{user.role} · @{user.username}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <Button variant="outline" icon={Camera} loading={uploading} onClick={() => fileRef.current?.click()}>Upload picture</Button>
          <p className="text-xs text-muted">JPG or PNG, up to 2 MB.</p>
        </div>
      ) : (
        <form onSubmit={submitPassword} className="space-y-4">
          <Field label="Current password" error={errors.current || errors.currentPassword}><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} invalid={!!(errors.current || errors.currentPassword)} /></Field>
          <Field label="New password" error={errors.next || errors.newPassword}><Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} invalid={!!(errors.next || errors.newPassword)} /></Field>
          <Field label="Confirm new password" error={errors.confirm}><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} invalid={!!errors.confirm} /></Field>
          <Button type="submit" loading={saving} className="w-full">Change password</Button>
        </form>
      )}
    </Modal>
  );
}
