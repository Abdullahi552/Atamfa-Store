import { Suspense, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Moon, Palmtree, Sun, UserRound } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import ProfileModal from '@/components/common/ProfileModal';
import NotificationBell from '@/components/common/NotificationBell';
import { Spinner } from '@/components/ui/Feedback';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cx } from '@/lib/format';
import { ROLES } from '@/lib/constants';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Rounded grey shell with greeting, pill navigation and quick actions (see reference design). */
export default function AppShell({ nav, wide = false }) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { theme, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const [profileTab, setProfileTab] = useState(null);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setMenu(false), menu);

  return (
    <div className="min-h-screen bg-bg p-2 sm:p-5 print:bg-white print:p-0">
      <div className={cx('mx-auto rounded-[2rem] bg-shell p-3 sm:p-6 print:rounded-none print:bg-white print:p-0', wide ? 'max-w-[1600px]' : 'max-w-[1360px]')}>
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 print:hidden">
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-3 rounded-full pr-2 text-left" aria-haspopup="menu" aria-expanded={menu}>
              <Avatar user={user} size={44} />
              <span className="font-display text-xl font-medium">{greeting()}, {user.name.split(' ')[0]}</span>
              <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
            </button>
            {menu && (
              <div role="menu" className="absolute left-0 top-14 z-40 w-60 animate-pop-in rounded-3xl bg-surface p-2 shadow-pop ring-1 ring-line">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs capitalize text-muted">{user.role}</p>
                </div>
                {[[UserRound, 'My profile', 'profile'], [KeyRound, 'Change password', 'password']].map(([Icon, label, tab]) => (
                  <button key={tab} role="menuitem" onClick={() => { setMenu(false); setProfileTab(tab); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm hover:bg-surface2"><Icon className="h-4 w-4 text-muted" />{label}</button>
                ))}
                <button role="menuitem" onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-rust hover:bg-surface2"><LogOut className="h-4 w-4" />Sign out</button>
              </div>
            )}
          </div>

          <nav className="order-last flex w-full gap-1 overflow-x-auto lg:order-none lg:mx-auto lg:w-auto" aria-label="Main">
            {nav.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition', isActive ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink')}>{label}</NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {settings.vacationMode && <span className="hidden items-center gap-1.5 rounded-full bg-gold/20 px-3 py-2 text-xs font-semibold text-gold sm:flex"><Palmtree className="h-4 w-4" />Vacation mode</span>}
            <button onClick={toggle} aria-label="Toggle dark mode" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-surface2">
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {user.role === ROLES.ADMIN && <NotificationBell />}
          </div>
        </header>

        <main className="mt-5 print:mt-0">
          <Suspense fallback={<div className="flex justify-center py-24"><Spinner className="h-7 w-7" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {profileTab && <ProfileModal initialTab={profileTab} onClose={() => setProfileTab(null)} />}
    </div>
  );
}
