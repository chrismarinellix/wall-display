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
  const { currentScreen } = useScreen();
  const ScreenComponent = screens[currentScreen];

  return (
    <div className="eink-container min-h-screen w-full relative overflow-hidden kiosk-mode">
      {/* Header bar */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-start justify-between p-4">
        <ConnectionStatus />
        <ClockWidget />
      </header>

      {/* Main screen content */}
      <main className="h-screen w-full pt-16 pb-12 px-6 overflow-auto">
        <ScreenComponent />
      </main>

      {/* Footer navigation */}
      <footer className="absolute bottom-0 left-0 right-0 z-50 flex justify-center p-3">
        <ScreenCycler />
      </footer>
    </div>
  );
}
