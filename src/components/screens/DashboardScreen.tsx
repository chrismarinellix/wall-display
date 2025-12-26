import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Sun, Cloud, CloudRain, CloudSnow, CloudSun, Droplets } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useStocks } from '../../hooks/useStocks';
import { useHackerNews } from '../../hooks/useHackerNews';
import { useScreen } from '../../contexts/ScreenContext';
import { weatherCodeToDescription } from '../../types/weather';

function getWeatherIcon(code: number, size: number = 40) {
  const props = { size, strokeWidth: 1 };
  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code === 2) return <CloudSun {...props} />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  return <Cloud {...props} />;
}

export function DashboardScreen() {
  const { current, forecast } = useWeather();
  const { crypto } = useStocks();
  const { stories } = useHackerNews(3);
  const { goToScreen } = useScreen();

  const btc = crypto.find(c => c.id === 'bitcoin');
  const eth = crypto.find(c => c.id === 'ethereum');

  return (
    <div className="h-full flex flex-col">
      {/* Top section: Date + Weather */}
      <div className="flex items-start justify-between mb-8">
        {/* Date */}
        <div>
          <div className="text-5xl font-extralight text-eink-black tracking-tight">
            {format(new Date(), 'EEEE')}
          </div>
          <div className="text-xl text-eink-mid font-light mt-1">
            {format(new Date(), 'MMMM d')}
          </div>
        </div>

        {/* Weather */}
        {current && (
          <div
            className="text-right cursor-pointer"
            onClick={() => goToScreen('weather')}
          >
            <div className="flex items-center justify-end gap-3">
              <div className="text-eink-dark">
                {getWeatherIcon(current.weatherCode, 36)}
              </div>
              <div className="stat-number text-6xl text-eink-black">
                {current.temperature}°
              </div>
            </div>
            <div className="text-sm text-eink-mid mt-1 flex items-center justify-end gap-3">
              <span>{weatherCodeToDescription[current.weatherCode]}</span>
              <span className="flex items-center gap-1">
                <Droplets size={12} />
                {current.humidity}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Middle section: Crypto prices */}
      <div
        className="flex gap-8 mb-8 pb-8 border-b border-eink-light cursor-pointer"
        onClick={() => goToScreen('stocks')}
      >
        {btc && (
          <div className="flex-1">
            <div className="eink-label mb-2">BTC</div>
            <div className="stat-number text-4xl text-eink-black">
              ${btc.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className={`flex items-center gap-1 mt-1 text-sm ${btc.changePercent24h >= 0 ? 'text-eink-black' : 'text-eink-mid'}`}>
              {btc.changePercent24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{btc.changePercent24h >= 0 ? '+' : ''}{btc.changePercent24h.toFixed(1)}%</span>
            </div>
          </div>
        )}
        {eth && (
          <div className="flex-1">
            <div className="eink-label mb-2">ETH</div>
            <div className="stat-number text-4xl text-eink-black">
              ${eth.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className={`flex items-center gap-1 mt-1 text-sm ${eth.changePercent24h >= 0 ? 'text-eink-black' : 'text-eink-mid'}`}>
              {eth.changePercent24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{eth.changePercent24h >= 0 ? '+' : ''}{eth.changePercent24h.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: Top HN Stories */}
      <div
        className="flex-1 cursor-pointer"
        onClick={() => goToScreen('hackernews')}
      >
        <div className="eink-label mb-4">Hacker News</div>
        <div className="space-y-4">
          {stories.slice(0, 3).map((story, i) => (
            <div key={story.id} className="flex gap-4">
              <div className="text-2xl font-extralight text-eink-light w-8">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-eink-black leading-snug line-clamp-2">
                  {story.title}
                </div>
                <div className="text-xs text-eink-mid mt-1">
                  {story.score} pts · {story.descendants || 0} comments
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast bar */}
      {forecast.length > 0 && (
        <div className="flex justify-between pt-6 mt-auto border-t border-eink-light">
          {forecast.slice(1, 6).map((day, i) => (
            <div key={i} className="text-center flex-1">
              <div className="text-[10px] text-eink-mid uppercase tracking-wider">
                {format(day.date, 'EEE')}
              </div>
              <div className="my-2 flex justify-center text-eink-dark">
                {getWeatherIcon(day.weatherCode, 18)}
              </div>
              <div className="text-sm font-medium text-eink-black">
                {day.tempMax}°
              </div>
              <div className="text-xs text-eink-mid">
                {day.tempMin}°
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
