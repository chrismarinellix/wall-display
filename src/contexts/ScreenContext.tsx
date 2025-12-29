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
  isNonCycleScreen: boolean;
}

const ScreenContext = createContext<ScreenContextType | null>(null);

// Screens that don't participate in auto-cycle (accessed via dedicated icon)
const NON_CYCLE_SCREENS: ScreenType[] = ['video'];

// How many screens to auto-cycle between (first N screens in screenOrder)
const AUTO_CYCLE_COUNT = 2;

export function ScreenProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0); // Start on first screen (Prophet)
  const [nonCycleScreen, setNonCycleScreen] = useState<ScreenType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const cycleTimerRef = useRef<number | null>(null);

  const screens = settings.screenOrder;
  const cycleInterval = settings.cycleInterval || 180000; // Use settings, default 3 min
  const currentScreen = nonCycleScreen || screens[currentIndex];
  const isNonCycleScreen = nonCycleScreen !== null;

  // Auto-cycle between first N screens only (Prophet & History)
  const goToNextCycleScreen = useCallback(() => {
    // Don't auto-cycle when on a non-cycle screen or paused
    if (nonCycleScreen || isPaused) return;

    // Only cycle if cycle interval is enabled
    if (cycleInterval <= 0) return;

    setCurrentIndex(prev => {
      // Only cycle between first AUTO_CYCLE_COUNT screens
      const maxCycleIndex = Math.min(AUTO_CYCLE_COUNT, screens.length) - 1;
      if (prev >= maxCycleIndex) return 0;
      return prev + 1;
    });
  }, [screens.length, nonCycleScreen, isPaused, cycleInterval]);

  // Reset the cycle timer (called after manual navigation)
  const resetCycleTimer = useCallback(() => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
    }
    // Only start cycle timer if interval is enabled
    if (cycleInterval > 0) {
      cycleTimerRef.current = window.setInterval(() => {
        goToNextCycleScreen();
      }, cycleInterval);
    }
  }, [goToNextCycleScreen, cycleInterval]);

  const nextScreen = useCallback(() => {
    setNonCycleScreen(null); // Return to cycle
    setCurrentIndex(prev => (prev + 1) % screens.length);
    resetCycleTimer();
  }, [screens.length, resetCycleTimer]);

  const prevScreen = useCallback(() => {
    setNonCycleScreen(null); // Return to cycle
    setCurrentIndex(prev => (prev - 1 + screens.length) % screens.length);
    resetCycleTimer();
  }, [screens.length, resetCycleTimer]);

  const goToScreen = useCallback((screen: ScreenType) => {
    // Check if it's a non-cycle screen
    if (NON_CYCLE_SCREENS.includes(screen)) {
      setNonCycleScreen(screen);
    } else {
      setNonCycleScreen(null); // Return to normal cycle
      const index = screens.indexOf(screen);
      if (index !== -1) setCurrentIndex(index);
    }
    resetCycleTimer();
  }, [screens, resetCycleTimer]);

  // Auto-cycle timer
  useEffect(() => {
    // Only start cycle timer if interval is enabled
    if (cycleInterval > 0) {
      cycleTimerRef.current = window.setInterval(() => {
        goToNextCycleScreen();
      }, cycleInterval);
    }

    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
      }
    };
  }, [goToNextCycleScreen, cycleInterval]);

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
      isNonCycleScreen,
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
