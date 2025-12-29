import { useRef, useState, useEffect, useCallback, TouchEvent } from 'react';
import { format } from 'date-fns';
import { useScreen } from '../../contexts/ScreenContext';
import { useSettings } from '../../contexts/SettingsContext';
import { WeatherScreen } from '../screens/WeatherScreen';
import { StocksScreen } from '../screens/StocksScreen';
import { QuotesScreen } from '../screens/QuotesScreen';
import { PomodoroScreen } from '../screens/PomodoroScreen';
import { JapaneseScreen } from '../screens/JapaneseScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CountdownScreen } from '../screens/CountdownScreen';
import { HomeAssistantScreen } from '../screens/HomeAssistantScreen';
import { MomentsScreen } from '../screens/MomentsScreen';
import { DailyProphetScreen } from '../screens/DailyProphetScreen';
import { SetupScreen } from '../screens/SetupScreen';
import { VideoScreen } from '../screens/VideoScreen';
import { ScreenType } from '../../types/settings';
import {
  Cloud,
  TrendingUp,
  Quote,
  Timer,
  Languages,
  Calendar,
  Clock,
  Home,
  Pause,
  Image,
  LayoutGrid,
  Settings,
  Video,
} from 'lucide-react';

const screens: Record<ScreenType, React.ComponentType> = {
  weather: WeatherScreen,
  stocks: StocksScreen,
  quotes: QuotesScreen,
  pomodoro: PomodoroScreen,
  japanese: JapaneseScreen,
  calendar: CalendarScreen,
  countdown: CountdownScreen,
  homeassistant: HomeAssistantScreen,
  moments: MomentsScreen,
  summary: DailyProphetScreen,
  setup: SetupScreen,
  video: VideoScreen,
};

const screenInfo: Record<ScreenType, { title: string; shortTitle: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
  weather: { title: 'Weather', shortTitle: 'Weather', Icon: Cloud },
  stocks: { title: 'Markets', shortTitle: 'Markets', Icon: TrendingUp },
  quotes: { title: 'Quote', shortTitle: 'Quote', Icon: Quote },
  pomodoro: { title: 'Focus', shortTitle: 'Focus', Icon: Timer },
  japanese: { title: 'Proverb', shortTitle: 'Proverb', Icon: Languages },
  calendar: { title: 'Calendar', shortTitle: 'Cal', Icon: Calendar },
  countdown: { title: 'Countdown', shortTitle: 'Timer', Icon: Clock },
  homeassistant: { title: 'Home', shortTitle: 'Home', Icon: Home },
  moments: { title: 'Moments', shortTitle: 'History', Icon: Image },
  summary: { title: 'Daily Prophet', shortTitle: 'Prophet', Icon: LayoutGrid },
  setup: { title: 'Setup', shortTitle: 'Setup', Icon: Settings },
  video: { title: 'Camera', shortTitle: 'Cam', Icon: Video },
};

// Screens that should NOT be in the auto-cycle (accessed via dedicated icon)
const nonCycleScreens: ScreenType[] = ['video'];

export function ScreenContainer() {
  const { currentScreen, currentIndex, totalScreens, nextScreen, prevScreen, goToScreen, isPaused } = useScreen();
  const { settings } = useSettings();
  const [navExpanded, setNavExpanded] = useState(false);
  const [hoveredScreen, setHoveredScreen] = useState<ScreenType | null>(null);
  const [dockVisible, setDockVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);
  const ScreenComponent = screens[currentScreen];
  const { title, Icon } = screenInfo[currentScreen];

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Hide dock after 6 seconds
  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setDockVisible(false);
      setNavExpanded(false);
    }, 6000);
  }, []);

  // Stop hide timer (when mouse is over dock)
  const stopHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Show dock and reset timer
  const showDock = useCallback(() => {
    setDockVisible(true);
    startHideTimer();
  }, [startHideTimer]);

  // Start hide timer on mount
  useEffect(() => {
    startHideTimer();
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [startHideTimer]);

  const handleTouchStart = (e: TouchEvent) => {
    // Show dock on any touch
    showDock();

    const target = e.target as HTMLElement;
    if (target.closest('button, input, [role="button"], .nav-dock')) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [role="button"], .nav-dock')) {
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      deltaX > 0 ? prevScreen() : nextScreen();
    }
  };

  const activeScreens = settings.screenOrder.slice(0, totalScreens);

  return (
    <div
      className="screen kiosk"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={showDock}
    >
      <div className="view">
        <div className="layout">
          <ScreenComponent />
        </div>
      </div>

      {/* Floating Navigation Dock - above title bar */}
      <div
        className="nav-dock"
        style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '6px 10px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 12,
          boxShadow: '0 1px 8px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          zIndex: 100,
          opacity: dockVisible ? (navExpanded ? 1 : 0.6) : 0,
          pointerEvents: dockVisible ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onMouseEnter={() => {
          stopHideTimer();
          setDockVisible(true);
          setNavExpanded(true);
        }}
        onMouseLeave={() => {
          setNavExpanded(false);
          setHoveredScreen(null);
          startHideTimer();
        }}
      >
        {/* Pause indicator */}
        {isPaused && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'rgba(0, 0, 0, 0.04)',
              borderRadius: 6,
              marginRight: 2,
            }}
            title="Auto-cycle paused - resumes in 30s"
          >
            <Pause size={11} strokeWidth={2} color="#bbb" />
          </div>
        )}
        {activeScreens.filter(s => !nonCycleScreens.includes(s)).map((screen) => {
          const info = screenInfo[screen];
          const isActive = screen === currentScreen;
          const isHovered = screen === hoveredScreen;
          const IconComponent = info.Icon;

          {
          const showLabel = isActive || (navExpanded && isHovered);
          return (
            <button
              key={screen}
              onClick={() => goToScreen(screen)}
              onMouseEnter={() => setHoveredScreen(screen)}
              onMouseLeave={() => setHoveredScreen(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: showLabel ? 5 : 0,
                padding: '6px',
                paddingRight: showLabel ? 10 : 6,
                background: isActive ? 'rgba(0, 0, 0, 0.1)' : isHovered ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isActive ? '#000' : '#222',
                minWidth: 30,
                height: 30,
              }}
              aria-label={info.title}
            >
              <IconComponent size={14} strokeWidth={isActive ? 2.5 : 1.5} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  width: showLabel ? 'auto' : 0,
                  maxWidth: showLabel ? 60 : 0,
                  opacity: showLabel ? 1 : 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {info.shortTitle}
              </span>
            </button>
          );
        }
        })}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

        {/* Non-cycle screens (Video) - always visible */}
        {nonCycleScreens.map((screen) => {
          const info = screenInfo[screen];
          const isActive = screen === currentScreen;
          const isHovered = screen === hoveredScreen;
          const IconComponent = info.Icon;

          {
          const showLabel = isActive || (navExpanded && isHovered);
          return (
            <button
              key={screen}
              onClick={() => goToScreen(screen)}
              onMouseEnter={() => setHoveredScreen(screen)}
              onMouseLeave={() => setHoveredScreen(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: showLabel ? 5 : 0,
                padding: '6px',
                paddingRight: showLabel ? 10 : 6,
                background: isActive ? 'rgba(0, 0, 0, 0.1)' : isHovered ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isActive ? '#000' : '#222',
                minWidth: 30,
                height: 30,
              }}
              aria-label={info.title}
            >
              <IconComponent size={14} strokeWidth={isActive ? 2.5 : 1.5} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  width: showLabel ? 'auto' : 0,
                  maxWidth: showLabel ? 60 : 0,
                  opacity: showLabel ? 1 : 0,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {info.shortTitle}
              </span>
            </button>
          );
        }
        })}
      </div>

      {/* Minimal title bar */}
      <div className="title_bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={16} strokeWidth={2} />
          <span className="title">{title}</span>
        </div>
        <span className="time">{format(new Date(), 'h:mm a')}</span>
      </div>
    </div>
  );
}
