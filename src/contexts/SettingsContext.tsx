import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings, defaultSettings } from '../types/settings';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem('wall-display-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter stored screens to only include valid ones, then add any new ones
        const validScreens = defaultSettings.screenOrder;
        const storedScreens = (parsed.screenOrder || []).filter((s: string) => validScreens.includes(s as any));
        const newScreens = validScreens.filter(s => !storedScreens.includes(s));
        const screenOrder = storedScreens.length > 0 ? [...storedScreens, ...newScreens] : validScreens;
        return { ...defaultSettings, ...parsed, screenOrder };
      } catch {
        return defaultSettings;
      }
    }

    // Load from env if available
    return {
      ...defaultSettings,
      cycleInterval: Number(import.meta.env.VITE_SCREEN_CYCLE_INTERVAL) || defaultSettings.cycleInterval,
      refreshInterval: Number(import.meta.env.VITE_DATA_REFRESH_INTERVAL) || defaultSettings.refreshInterval,
      latitude: Number(import.meta.env.VITE_DEFAULT_LATITUDE) || defaultSettings.latitude,
      longitude: Number(import.meta.env.VITE_DEFAULT_LONGITUDE) || defaultSettings.longitude,
    };
  });

  useEffect(() => {
    localStorage.setItem('wall-display-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
