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

  // Auto-cycle screens (but not when on pomodoro)
  useEffect(() => {
    if (isPaused || settings.cycleInterval === 0) return;
    if (currentScreen === 'pomodoro') return; // Don't cycle away from pomodoro

    const timer = setInterval(nextScreen, settings.cycleInterval);
    return () => clearInterval(timer);
  }, [isPaused, settings.cycleInterval, nextScreen, currentScreen]);

  // Pause on user interaction, resume after 60s
  useEffect(() => {
    let resumeTimer: number;

    const handleInteraction = () => {
      setIsPaused(true);
      clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => setIsPaused(false), 60000);
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
