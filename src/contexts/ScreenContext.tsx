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

// Auto-cycle through screens every 1 minute
const CYCLE_INTERVAL = 60000;

// Screens that don't participate in auto-cycle
const NON_CYCLE_SCREENS: ScreenType[] = ['video'];

export function ScreenProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Start on a random screen
    const screenCount = settings.screenOrder.length;
    return Math.floor(Math.random() * screenCount);
  });
  const [nonCycleScreen, setNonCycleScreen] = useState<ScreenType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const cycleTimerRef = useRef<number | null>(null);

  const screens = settings.screenOrder;
  const currentScreen = nonCycleScreen || screens[currentIndex];
  const isNonCycleScreen = nonCycleScreen !== null;

  // Go to a random different screen
  const goToRandomScreen = useCallback(() => {
    if (screens.length <= 1) return;

    // Don't auto-cycle when on a non-cycle screen
    if (nonCycleScreen) return;

    setCurrentIndex(prev => {
      // Pick a random index that's different from current
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * screens.length);
      } while (newIndex === prev && screens.length > 1);
      return newIndex;
    });
  }, [screens.length, nonCycleScreen]);

  // Reset the cycle timer (called after manual navigation)
  const resetCycleTimer = useCallback(() => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
    }
    // Start new cycle timer
    cycleTimerRef.current = window.setInterval(() => {
      goToRandomScreen();
    }, CYCLE_INTERVAL);
  }, [goToRandomScreen]);

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
    // Start the cycle timer
    cycleTimerRef.current = window.setInterval(() => {
      goToRandomScreen();
    }, CYCLE_INTERVAL);

    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
      }
    };
  }, [goToRandomScreen]);

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
