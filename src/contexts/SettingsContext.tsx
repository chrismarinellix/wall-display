import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings, defaultSettings } from '../types/settings';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Always use env vars or defaults for coordinates (Melbourne)
    const latitude = Number(import.meta.env.VITE_DEFAULT_LATITUDE) || defaultSettings.latitude;
    const longitude = Number(import.meta.env.VITE_DEFAULT_LONGITUDE) || defaultSettings.longitude;

    const stored = localStorage.getItem('wall-display-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter stored screens to only include valid ones, then add any new ones
        const validScreens = defaultSettings.screenOrder;
        const storedScreens = (parsed.screenOrder || []).filter((s: string) => validScreens.includes(s as any));
        const newScreens = validScreens.filter(s => !storedScreens.includes(s));
        const screenOrder = storedScreens.length > 0 ? [...storedScreens, ...newScreens] : validScreens;
        // Override stored lat/lon with env vars to fix stale location data
        return { ...defaultSettings, ...parsed, screenOrder, latitude, longitude };
      } catch {
        return { ...defaultSettings, latitude, longitude };
      }
    }

    // Load from env if available
    return {
      ...defaultSettings,
      cycleInterval: Number(import.meta.env.VITE_SCREEN_CYCLE_INTERVAL) || defaultSettings.cycleInterval,
      refreshInterval: Number(import.meta.env.VITE_DATA_REFRESH_INTERVAL) || defaultSettings.refreshInterval,
      latitude,
      longitude,
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
