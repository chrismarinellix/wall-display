import { useRef, TouchEvent } from 'react';
import { useScreen } from '../../contexts/ScreenContext';
import { ClockWidget } from './ClockWidget';
import { ScreenCycler } from './ScreenCycler';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { DashboardScreen } from '../screens/DashboardScreen';
import { EmailScreen } from '../screens/EmailScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { WeatherScreen } from '../screens/WeatherScreen';
import { StocksScreen } from '../screens/StocksScreen';
import { HackerNewsScreen } from '../screens/HackerNewsScreen';
import { QuotesScreen } from '../screens/QuotesScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { ScreenType } from '../../types/settings';

const screens: Record<ScreenType, React.ComponentType> = {
  dashboard: DashboardScreen,
  emails: EmailScreen,
  calendar: CalendarScreen,
  weather: WeatherScreen,
  stocks: StocksScreen,
  hackernews: HackerNewsScreen,
  quotes: QuotesScreen,
  news: NewsScreen,
};

export function ScreenContainer() {
  const { currentScreen, nextScreen, prevScreen } = useScreen();
  const ScreenComponent = screens[currentScreen];

  // Touch/swipe handling
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is greater than vertical (not scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        prevScreen(); // Swipe right = previous
      } else {
        nextScreen(); // Swipe left = next
      }
    }
  };

  return (
    <div
      className="eink-container min-h-screen w-full relative overflow-hidden kiosk-mode"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header bar */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-6">
        <ConnectionStatus />
        <ClockWidget />
      </header>

      {/* Main screen content */}
      <main className="h-screen w-full pt-20 pb-16 px-8 overflow-auto">
        <ScreenComponent />
      </main>

      {/* Footer navigation */}
      <footer className="absolute bottom-0 left-0 right-0 z-50 flex justify-center p-4">
        <ScreenCycler />
      </footer>
    </div>
  );
}
