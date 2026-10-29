import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings, QRDesignSettings } from '@/types';
import { defaultDesign, defaultSettings } from '@/lib/defaults';
import { getSettings, saveSettings } from '@/lib/storage/db';

interface SettingsContextValue {
  settings: AppSettings;
  /** False until saved settings were read (or reading failed). */
  loaded: boolean;
  /** Set when browser storage refuses writes, so the UI can say changes will not persist. */
  storageError: boolean;
  update: (patch: Partial<AppSettings>) => void;
  /** Replaces every setting at once (used by backup import and reset). */
  replace: (next: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyTheme(theme: AppSettings['theme']) {
  const light = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.classList.toggle('light', light);
  try { localStorage.setItem('qrs-theme', theme); } catch { /* storage blocked: the theme still applies for this visit */ }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then(s => { if (!cancelled && s) setSettings({ ...defaultSettings, ...s }); })
      .catch(() => { if (!cancelled) setStorageError(true); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  const persist = useCallback((next: AppSettings) => {
    saveSettings(next).then(() => setStorageError(false)).catch(() => setStorageError(true));
  }, []);

  const replace = useCallback((next: AppSettings) => {
    const merged = { ...defaultSettings, ...next };
    setSettings(merged);
    persist(merged);
  }, [persist]);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo(() => ({ settings, loaded, storageError, update, replace }), [settings, loaded, storageError, update, replace]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

/** Starting design for a new code: the built-in default with the user's chosen defaults applied. */
export function designFromSettings(s: AppSettings): QRDesignSettings {
  return {
    ...defaultDesign,
    width: s.defaultExportWidth,
    height: s.defaultExportHeight,
    errorCorrection: s.defaultErrorCorrection,
    foreground: { type: 'solid', color: s.defaultForegroundColor },
    cornerSquareColor: { type: 'solid', color: s.defaultForegroundColor },
    cornerDotColor: { type: 'solid', color: s.defaultForegroundColor },
    background: { type: 'solid', color: s.defaultBackgroundColor },
  };
}
