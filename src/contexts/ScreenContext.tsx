import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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

// Return to summary/home after 1 minute of inactivity
const INACTIVITY_TIMEOUT = 60000;

export function ScreenProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const inactivityTimerRef = useRef<number | null>(null);

  const screens = settings.screenOrder;
  const currentScreen = screens[currentIndex];

  const goToHome = useCallback(() => {
    // Prefer summary screen, fallback to weather, then first screen
    const summaryIndex = screens.indexOf('summary');
    if (summaryIndex !== -1) {
      setCurrentIndex(summaryIndex);
      return;
    }
    const weatherIndex = screens.indexOf('weather');
    if (weatherIndex !== -1) {
      setCurrentIndex(weatherIndex);
      return;
    }
    setCurrentIndex(0);
  }, [screens]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      goToHome();
    }, INACTIVITY_TIMEOUT);
  }, [goToHome]);

  const nextScreen = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % screens.length);
    resetInactivityTimer();
  }, [screens.length, resetInactivityTimer]);

  const prevScreen = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + screens.length) % screens.length);
    resetInactivityTimer();
  }, [screens.length, resetInactivityTimer]);

  const goToScreen = useCallback((screen: ScreenType) => {
    const index = screens.indexOf(screen);
    if (index !== -1) setCurrentIndex(index);
    resetInactivityTimer();
  }, [screens, resetInactivityTimer]);

  // Start inactivity timer on mount and reset on any interaction
  useEffect(() => {
    const handleInteraction = () => {
      resetInactivityTimer();
    };

    // Start the timer
    resetInactivityTimer();

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in form elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

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
