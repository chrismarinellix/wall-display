import { useRef, TouchEvent } from 'react';
import { format } from 'date-fns';
import { useScreen } from '../../contexts/ScreenContext';
import { useSettings } from '../../contexts/SettingsContext';
import { DashboardScreen } from '../screens/DashboardScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { WeatherScreen } from '../screens/WeatherScreen';
import { StocksScreen } from '../screens/StocksScreen';
import { HackerNewsScreen } from '../screens/HackerNewsScreen';
import { QuotesScreen } from '../screens/QuotesScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { PomodoroScreen } from '../screens/PomodoroScreen';
import { JapaneseScreen } from '../screens/JapaneseScreen';
import { ScreenType } from '../../types/settings';
import {
  LayoutDashboard,
  Cloud,
  TrendingUp,
  Flame,
  Quote,
  Newspaper,
  Timer,
  Languages,
} from 'lucide-react';

const screens: Record<ScreenType, React.ComponentType> = {
  dashboard: DashboardScreen,
  emails: EmailScreen,
  calendar: CalendarScreen,
  weather: WeatherScreen,
  stocks: StocksScreen,
  hackernews: HackerNewsScreen,
  quotes: QuotesScreen,
  news: NewsScreen,
  pomodoro: PomodoroScreen,
  japanese: JapaneseScreen,
};

const screenInfo: Record<ScreenType, { title: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
  dashboard: { title: 'Dashboard', Icon: LayoutDashboard },
  emails: { title: 'Mail', Icon: LayoutDashboard },
  calendar: { title: 'Calendar', Icon: LayoutDashboard },
  weather: { title: 'Weather', Icon: Cloud },
  stocks: { title: 'Markets', Icon: TrendingUp },
  hackernews: { title: 'Hacker News', Icon: Flame },
  quotes: { title: 'Quote', Icon: Quote },
  news: { title: 'News', Icon: Newspaper },
  pomodoro: { title: 'Pomodoro', Icon: Timer },
  japanese: { title: 'Kanji', Icon: Languages },
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
