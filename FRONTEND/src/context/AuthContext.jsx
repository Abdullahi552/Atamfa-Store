import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/lib/storage';
import { AUTH_EXPIRED_EVENT } from '@/lib/http';
import { useToast } from '@/context/ToastContext';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  // Restore the session after a refresh.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authService.me().then(setUser).catch(() => tokenStorage.clear()).finally(() => setLoading(false));
  }, []);

  // Any 401 from the API ends the session.
  useEffect(() => {
    const onExpired = () => {
      if (!tokenStorage.get()) return;
      tokenStorage.clear();
      setUser(null);
      toast.info('Your session has ended. Please sign in again.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [toast]);

  const login = useCallback(async (username, password) => {
    const { token, user: u } = await authService.login(username, password);
    tokenStorage.set(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* still sign out locally */ }
    tokenStorage.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => setUser((u) => (u ? { ...u, ...patch } : u)), []);

  const value = useMemo(() => ({ user, loading, login, logout, updateUser }), [user, loading, login, logout, updateUser]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
