import { useRef, TouchEvent } from 'react';
import { format } from 'date-fns';
import { useScreen } from '../../contexts/ScreenContext';
import { useSettings } from '../../contexts/SettingsContext';
import { WeatherScreen } from '../screens/WeatherScreen';
import { StocksScreen } from '../screens/StocksScreen';
import { QuotesScreen } from '../screens/QuotesScreen';
import { PomodoroScreen } from '../screens/PomodoroScreen';
import { JapaneseScreen } from '../screens/JapaneseScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { LocationScreen } from '../screens/LocationScreen';
import { CountdownScreen } from '../screens/CountdownScreen';
import { HomeAssistantScreen } from '../screens/HomeAssistantScreen';
import { ScreenType } from '../../types/settings';
import {
  Cloud,
  TrendingUp,
  Quote,
  Timer,
  Languages,
  Calendar,
  MapPin,
  Clock,
  Home,
  ChevronRight,
} from 'lucide-react';

const screens: Record<ScreenType, React.ComponentType> = {
  weather: WeatherScreen,
  stocks: StocksScreen,
  quotes: QuotesScreen,
  pomodoro: PomodoroScreen,
  japanese: JapaneseScreen,
  calendar: CalendarScreen,
  location: LocationScreen,
  countdown: CountdownScreen,
  homeassistant: HomeAssistantScreen,
};

const screenInfo: Record<ScreenType, { title: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
  weather: { title: 'Weather', Icon: Cloud },
  stocks: { title: 'Markets', Icon: TrendingUp },
  quotes: { title: 'Quote', Icon: Quote },
  pomodoro: { title: 'Pomodoro', Icon: Timer },
  japanese: { title: 'Proverb', Icon: Languages },
  calendar: { title: 'Calendar', Icon: Calendar },
  location: { title: 'Location', Icon: MapPin },
  countdown: { title: 'Countdown', Icon: Clock },
  homeassistant: { title: 'Home', Icon: Home },
};

export function ScreenContainer() {
  const { currentScreen, currentIndex, totalScreens, nextScreen, prevScreen, goToScreen } = useScreen();
  const { settings } = useSettings();
  const ScreenComponent = screens[currentScreen];
  const { title, Icon } = screenInfo[currentScreen];

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      deltaX > 0 ? prevScreen() : nextScreen();
    }
  };

  return (
    <div
      className="screen kiosk"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="view">
        <div className="layout">
          <ScreenComponent />
        </div>
      </div>

      {/* Subtle next arrow in bottom right */}
      <button
        onClick={nextScreen}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.15,
          padding: 8,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.4')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.15')}
        aria-label="Next screen"
      >
        <ChevronRight size={32} strokeWidth={1.5} />
      </button>

      <div className="title_bar">
        <Icon size={16} strokeWidth={2} />
        <span className="title">{title}</span>

        <div className="nav-dots">
          {settings.screenOrder.slice(0, totalScreens).map((screen, i) => (
            <button
              key={screen}
              onClick={() => goToScreen(screen)}
              className={`nav-dot ${i === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        <span className="time">{format(new Date(), 'h:mm a')}</span>
      </div>
    </div>
  );
}
