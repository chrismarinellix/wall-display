import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Flame, Sun, Cloud, CloudRain, CloudSnow } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useStocks } from '../../hooks/useStocks';
import { useHackerNews } from '../../hooks/useHackerNews';
import { useScreen } from '../../contexts/ScreenContext';
import { weatherCodeToDescription } from '../../types/weather';

function getWeatherIcon(code: number, size: number = 40) {
  const props = { size, strokeWidth: 1.25 };
  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  return <Cloud {...props} />;
}

export function DashboardScreen() {
  const { current, forecast } = useWeather();
  const { crypto } = useStocks();
  const { stories } = useHackerNews(5);
  const { goToScreen } = useScreen();

  const topCrypto = crypto[0]; // Bitcoin

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Weather - Large hero display */}
      {current && (
        <div
          className="cursor-pointer py-4"
          onClick={() => goToScreen('weather')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="stat-number text-8xl tracking-tighter text-eink-black">
                {current.temperature}°
              </div>
              <div className="text-sm text-eink-dark mt-2 tracking-tight">
                {weatherCodeToDescription[current.weatherCode] || 'Unknown'}
              </div>
            </div>
            <div className="text-eink-dark pt-2">
              {getWeatherIcon(current.weatherCode, 56)}
            </div>
          </div>
        </div>
      )}

      {/* Crypto & Top Story cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bitcoin */}
        {topCrypto && (
          <div
            className="eink-card p-5 cursor-pointer"
            onClick={() => goToScreen('stocks')}
          >
            <div className="eink-label mb-3">Bitcoin</div>
            <div className="stat-number text-3xl text-eink-black">
              ${topCrypto.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className={`stat-change flex items-center gap-1 mt-2 ${topCrypto.changePercent24h >= 0 ? 'positive' : 'negative'}`}>
              {topCrypto.changePercent24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{topCrypto.changePercent24h >= 0 ? '+' : ''}{topCrypto.changePercent24h.toFixed(2)}%</span>
            </div>
          </div>
        )}

        {/* Top HN Story */}
        {stories[0] && (
          <div
            className="eink-card p-5 cursor-pointer"
            onClick={() => goToScreen('hackernews')}
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame size={12} className="text-eink-mid" />
              <span className="eink-label">Top on HN</span>
            </div>
            <div className="text-sm font-medium text-eink-black leading-snug line-clamp-3">
              {stories[0].title}
            </div>
            <div className="text-xs text-eink-mid mt-2">
              {stories[0].score} pts
            </div>
          </div>
        )}
      </div>

      {/* Date display */}
      <div className="text-center py-4">
        <div className="text-4xl font-light text-eink-black">
          {format(new Date(), 'EEEE')}
        </div>
        <div className="text-lg text-eink-mid mt-1">
          {format(new Date(), 'MMMM d, yyyy')}
        </div>
      </div>

      {/* Forecast strip */}
      {forecast.length > 0 && (
        <div className="flex justify-around py-3 border-t border-eink-light mt-auto">
          {forecast.slice(1, 6).map((day, i) => (
            <div key={i} className="text-center">
              <div className="text-[10px] text-eink-mid uppercase tracking-wide">
                {format(day.date, 'EEE')}
              </div>
              <div className="text-sm text-eink-dark font-medium mt-1">
                {day.tempMax}°
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
