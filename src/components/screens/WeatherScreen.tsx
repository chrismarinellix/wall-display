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
  Droplets,
  Wind,
  Thermometer,
} from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { Loading } from '../ui/Loading';
import { weatherCodeToDescription, WeatherForecast } from '../../types/weather';

function getWeatherIcon(code: number, size: number = 24) {
  const props = { size, strokeWidth: 1 };

  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code === 2) return <CloudSun {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code >= 45 && code <= 48) return <CloudFog {...props} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle {...props} />;
  if (code >= 61 && code <= 65) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  if (code >= 80 && code <= 82) return <CloudRain {...props} />;
  if (code >= 85 && code <= 86) return <CloudSnow {...props} />;
  if (code >= 95) return <CloudLightning {...props} />;

  return <Cloud {...props} />;
}

function ForecastDay({ forecast, isToday }: { forecast: WeatherForecast; isToday?: boolean }) {
  return (
    <div className={`flex-1 text-center py-4 ${isToday ? 'bg-eink-light' : ''}`}>
      <div className="text-xs text-eink-mid uppercase tracking-wider mb-3">
        {isToday ? 'Today' : format(forecast.date, 'EEE')}
      </div>
      <div className="flex justify-center mb-3 text-eink-dark">
        {getWeatherIcon(forecast.weatherCode, 28)}
      </div>
      <div className="text-xl font-medium text-eink-black">
        {forecast.tempMax}°
      </div>
      <div className="text-sm text-eink-mid">
        {forecast.tempMin}°
      </div>
    </div>
  );
}

export function WeatherScreen() {
  const { current, forecast, loading, error, lastFetched } = useWeather();

  if (loading && !current) {
    return <Loading message="Fetching weather..." />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Error state */}
      {error && (
        <div className="text-sm text-eink-dark bg-eink-light p-3 mb-6">
          {error}
        </div>
      )}

      {current ? (
        <>
          {/* Hero current weather */}
          <div className="flex-1 flex flex-col justify-center items-center text-center mb-8">
            <div className="text-eink-dark mb-4">
              {getWeatherIcon(current.weatherCode, 80)}
            </div>
            <div className="stat-number text-9xl text-eink-black mb-2">
              {current.temperature}°
            </div>
            <div className="text-2xl text-eink-dark font-light">
              {weatherCodeToDescription[current.weatherCode] || 'Unknown'}
            </div>

            {/* Stats row */}
            <div className="flex gap-8 mt-8 text-eink-mid">
              <div className="flex items-center gap-2">
                <Droplets size={18} />
                <span className="text-lg">{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind size={18} />
                <span className="text-lg">{current.windSpeed} km/h</span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer size={18} />
                <span className="text-lg">Feels {current.temperature}°</span>
              </div>
            </div>
          </div>

          {/* 7-day forecast */}
          {forecast.length > 0 && (
            <div className="border-t border-eink-light">
              <div className="flex divide-x divide-eink-light">
                {forecast.slice(0, 7).map((day, i) => (
                  <ForecastDay key={i} forecast={day} isToday={i === 0} />
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
        <div className="text-xs text-eink-mid eink-mono pt-4 text-center">
          Updated {format(lastFetched, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
