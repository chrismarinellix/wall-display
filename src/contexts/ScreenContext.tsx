import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ScreenType } from '../types/settings';
import { useSettings } from './SettingsContext';

interface ScreenContextType {
  currentScreen: ScreenType;
  currentIndex: number;
  totalScreens: number;
  nextScreen: () => void;
  prevScreen: () => void;
  goToScreen: (screen: ScreenType) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

// Per-screen display duration multipliers (relative to base cycle interval)
// Weather is quick info, stocks/quotes need more reading time
const SCREEN_DURATION_MULTIPLIERS: Record<ScreenType, number> = {
  weather: 0.5,    // 15s if base is 30s - just a quick glance
  stocks: 1.5,     // 45s - more info to absorb
  quotes: 1.2,     // 36s - time to read and reflect
  pomodoro: 1,     // doesn't auto-cycle anyway
  japanese: 1.3,   // 39s - time to read and understand
  calendar: 1.5,   // 45s - time to read events
  countdown: 1.2,  // 36s - time to see countdowns
  homeassistant: 1, // 30s - quick status check
};

const ScreenContext = createContext<ScreenContextType | null>(null);

export function ScreenProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const screens = settings.screenOrder;
  const currentScreen = screens[currentIndex];

  const nextScreen = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % screens.length);
  }, [screens.length]);

  const prevScreen = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + screens.length) % screens.length);
  }, [screens.length]);

  const goToScreen = useCallback((screen: ScreenType) => {
    const index = screens.indexOf(screen);
    if (index !== -1) setCurrentIndex(index);
  }, [screens]);

  // Auto-cycle screens with per-screen timing (but not when on pomodoro)
  useEffect(() => {
    if (isPaused || settings.cycleInterval === 0) return;
    if (currentScreen === 'pomodoro') return; // Don't cycle away from pomodoro

    // Get the multiplier for the current screen
    const multiplier = SCREEN_DURATION_MULTIPLIERS[currentScreen] || 1;
    const screenDuration = Math.round(settings.cycleInterval * multiplier);

    const timer = setTimeout(nextScreen, screenDuration);
    return () => clearTimeout(timer);
  }, [isPaused, settings.cycleInterval, nextScreen, currentScreen]);

  // Pause on user interaction, resume after 30s
  useEffect(() => {
    let resumeTimer: number;

    const handleInteraction = () => {
      setIsPaused(true);
      clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => setIsPaused(false), 30000);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      clearTimeout(resumeTimer);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextScreen();
      } else if (e.key === 'ArrowLeft') {
        prevScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextScreen, prevScreen]);

  return (
    <ScreenContext.Provider value={{
      currentScreen,
      currentIndex,
      totalScreens: screens.length,
      nextScreen,
      prevScreen,
      goToScreen,
      isPaused,
      setIsPaused,
    }}>
      {children}
    </ScreenContext.Provider>
  );
}

export function useScreen() {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenProvider');
  }
  return context;
}
