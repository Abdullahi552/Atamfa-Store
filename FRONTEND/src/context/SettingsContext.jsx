import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { settingsService } from '@/services/miscService';
import { useAuth } from '@/context/AuthContext';

const DEFAULTS = {
  shopName: 'Atamfa Shop',
  shopAddress: '',
  shopPhone: '',
  shopLogoUrl: null,
  taxRate: 2,
  maxDiscountPercent: 10,
  lowStockThreshold: 5,
  receiptFooter: 'Thank you for your patronage!',
  vacationMode: false,
};

const SettingsCtx = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try { setSettings({ ...DEFAULTS, ...(await settingsService.get()) }); } catch { /* keep defaults */ } finally { setLoaded(true); }
  }, []);

  useEffect(() => { if (user) refresh(); else setLoaded(false); }, [user, refresh]);

  const value = useMemo(() => ({ settings, loaded, refresh, setSettings: (s) => setSettings((p) => ({ ...p, ...s })) }), [settings, loaded, refresh]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
export const useSettings = () => useContext(SettingsCtx);
