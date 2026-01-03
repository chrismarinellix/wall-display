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
  isInteractiveScreen: boolean;
}

const ScreenContext = createContext<ScreenContextType | null>(null);

// Screens that don't participate in auto-cycle (accessed via dedicated icon)
const NON_CYCLE_SCREENS: ScreenType[] = ['video'];

// Interactive screens that pause auto-cycle while active (user is working on them)
const INTERACTIVE_SCREENS: ScreenType[] = ['projects', 'setup', 'calendar', 'pomodoro', 'countdown'];

// How many screens to auto-cycle between (first N screens in screenOrder)
const AUTO_CYCLE_COUNT = 4;

// Per-screen display durations (in ms)
const SCREEN_DURATIONS: Record<string, number> = {
  'summary': 300000,   // 5 minutes - daily briefing first
  'weather': 180000,   // 3 minutes - weather
  'japanese': 120000,  // 2 minutes - proverbs
  'moments': 120000,   // 2 minutes - history
  'quotes': 120000,    // 2 minutes - quotes
};
const DEFAULT_DURATION = 120000; // 2 minutes default

export function ScreenProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0); // Start on first screen (Weather)
  const [nonCycleScreen, setNonCycleScreen] = useState<ScreenType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const cycleTimerRef = useRef<number | null>(null);

  const screens = settings.screenOrder;
  const currentScreen = nonCycleScreen || screens[currentIndex];
  const isNonCycleScreen = nonCycleScreen !== null;
  const isInteractiveScreen = INTERACTIVE_SCREENS.includes(currentScreen);

  // Get duration for current screen
  const getCurrentDuration = useCallback(() => {
    const screen = screens[currentIndex];
    return SCREEN_DURATIONS[screen] || DEFAULT_DURATION;
  }, [screens, currentIndex]);

  // Auto-cycle between first N screens (Weather, Prophet, History)
  const goToNextCycleScreen = useCallback(() => {
    // Don't auto-cycle when on a non-cycle screen, interactive screen, or paused
    if (nonCycleScreen || isPaused || isInteractiveScreen) return;

    setCurrentIndex(prev => {
      // Only cycle between first AUTO_CYCLE_COUNT screens
      const maxCycleIndex = Math.min(AUTO_CYCLE_COUNT, screens.length) - 1;
      if (prev >= maxCycleIndex) return 0;
      return prev + 1;
    });
  }, [screens.length, nonCycleScreen, isPaused, isInteractiveScreen]);

  // Schedule next screen transition based on current screen's duration
  const scheduleNextTransition = useCallback(() => {
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
    }
    const duration = getCurrentDuration();
    cycleTimerRef.current = window.setTimeout(() => {
      goToNextCycleScreen();
      scheduleNextTransition(); // Schedule the next one
    }, duration);
  }, [getCurrentDuration, goToNextCycleScreen]);

  // Reset the cycle timer (called after manual navigation)
  const resetCycleTimer = useCallback(() => {
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
    }
    scheduleNextTransition();
  }, [scheduleNextTransition]);

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

  // Auto-cycle timer - uses per-screen durations
  useEffect(() => {
    scheduleNextTransition();

    return () => {
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
      }
    };
  }, [scheduleNextTransition]);

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
      isInteractiveScreen,
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
