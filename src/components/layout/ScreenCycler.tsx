import { useScreen } from '../../contexts/ScreenContext';
import { useSettings } from '../../contexts/SettingsContext';
import { ScreenType } from '../../types/settings';

const screenLabels: Record<ScreenType, string> = {
  weather: 'Weather',
  stocks: 'Markets',
  quotes: 'Quote',
  pomodoro: 'Timer',
  japanese: 'Proverb',
  calendar: 'Calendar',
  countdown: 'Countdown',
  homeassistant: 'Home',
  moments: 'History',
};

export function ScreenCycler() {
  const { currentScreen, currentIndex, totalScreens, goToScreen, isPaused } = useScreen();
  const { settings } = useSettings();

  // Use screen order from settings
  const screens = settings.screenOrder;

  return (
    <div className="flex items-center gap-3">
      {/* Navigation dots - show up to 8 dots */}
      <div className="flex gap-1.5">
        {screens.slice(0, Math.min(totalScreens, 8)).map((screen, index) => (
          <button
            key={screen}
            onClick={() => goToScreen(screen)}
            className={`nav-dot ${index === currentIndex ? 'active' : ''}`}
            aria-label={`Go to ${screenLabels[screen]}`}
          />
        ))}
      </div>

      {/* Current screen label */}
      <span className="eink-mono text-xs text-eink-dark">
        {screenLabels[currentScreen]}
      </span>

      {/* Pause indicator */}
      {isPaused && (
        <span className="text-xs text-eink-mid" title="Auto-cycle paused">
          ||
        </span>
      )}
    </div>
  );
}
