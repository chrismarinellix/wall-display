import { format } from 'date-fns';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudSun,
  CloudDrizzle,
  RefreshCw,
  Droplets,
  Wind,
} from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { Loading } from '../ui/Loading';
import { weatherCodeToDescription, WeatherForecast } from '../../types/weather';

function getWeatherIcon(code: number, size: number = 24) {
  const iconProps = { size, className: 'text-eink-black' };

  if (code === 0 || code === 1) return <Sun {...iconProps} />;
  if (code === 2) return <CloudSun {...iconProps} />;
  if (code === 3) return <Cloud {...iconProps} />;
  if (code >= 45 && code <= 48) return <CloudFog {...iconProps} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle {...iconProps} />;
  if (code >= 61 && code <= 65) return <CloudRain {...iconProps} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...iconProps} />;
  if (code >= 80 && code <= 82) return <CloudRain {...iconProps} />;
  if (code >= 85 && code <= 86) return <CloudSnow {...iconProps} />;
  if (code >= 95) return <CloudLightning {...iconProps} />;

  return <Cloud {...iconProps} />;
}

function ForecastDay({ forecast }: { forecast: WeatherForecast }) {
  return (
    <div className="flex flex-col items-center py-3 px-2 flex-1">
      <div className="eink-mono text-xs text-eink-dark mb-2">
        {format(forecast.date, 'EEE')}
      </div>
      <div className="mb-2">
        {getWeatherIcon(forecast.weatherCode, 20)}
      </div>
      <div className="flex items-center gap-1 text-sm">
        <span className="font-medium">{forecast.tempMax}°</span>
        <span className="text-eink-mid">{forecast.tempMin}°</span>
      </div>
    </div>
  );
}

export function WeatherScreen() {
  const { current, forecast, loading, error, refresh, lastFetched } = useWeather();

  if (loading && !current) {
    return <Loading message="Fetching weather..." />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="eink-heading text-xl">Weather</h1>
        <button
          onClick={refresh}
          className="p-2 hover:bg-eink-light rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-sm text-eink-dark bg-eink-light p-3 rounded mb-4">
          {error}
        </div>
      )}

      {current ? (
        <>
          {/* Current weather */}
          <div className="eink-card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-6xl font-light eink-heading mb-2">
                  {current.temperature}°
                </div>
                <div className="text-lg text-eink-dark">
                  {weatherCodeToDescription[current.weatherCode] || 'Unknown'}
                </div>
              </div>
              <div className="text-right">
                {getWeatherIcon(current.weatherCode, 64)}
              </div>
            </div>

            {/* Details */}
            <div className="flex gap-6 mt-6 pt-4 border-t border-eink-light">
              <div className="flex items-center gap-2 text-sm text-eink-dark">
                <Droplets size={16} />
                <span>{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-eink-dark">
                <Wind size={16} />
                <span>{current.windSpeed} km/h</span>
              </div>
            </div>
          </div>

          {/* Forecast */}
          {forecast.length > 0 && (
            <div className="eink-card">
              <div className="flex divide-x divide-eink-light">
                {forecast.slice(0, 5).map((day, i) => (
                  <ForecastDay key={i} forecast={day} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">Unable to load weather</p>
        </div>
      )}

      {/* Last updated */}
      {lastFetched && (
        <div className="text-xs text-eink-mid eink-mono pt-4 text-center mt-auto">
          Updated {format(lastFetched, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
