import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { weatherCodeToDescription } from '../../types/weather';

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  const props = { size, strokeWidth: 1.5 };
  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  return <Cloud {...props} />;
}

export function WeatherScreen() {
  const { current, forecast } = useWeather();

  if (!current) {
    return <div className="flex flex--center flex-1"><span className="description">Loading weather...</span></div>;
  }

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Hero weather - centered */}
      <div className="flex flex--col flex--center flex-1 text-center">
        <WeatherIcon code={current.weatherCode} size={64} />

        <div className="value value--xxxlarge" style={{ marginTop: 16 }}>
          {current.temperature}°
        </div>

        <div className="description" style={{ fontSize: 18, marginTop: 12 }}>
          {weatherCodeToDescription[current.weatherCode] || 'Unknown'}
        </div>

        <div className="flex gap--large" style={{ marginTop: 24 }}>
          <div className="flex gap--small" style={{ alignItems: 'center' }}>
            <Droplets size={18} strokeWidth={1.5} />
            <span className="label">{current.humidity}%</span>
          </div>
          <div className="flex gap--small" style={{ alignItems: 'center' }}>
            <Wind size={18} strokeWidth={1.5} />
            <span className="label">{current.windSpeed} km/h</span>
          </div>
        </div>
      </div>

      {/* Forecast bar */}
      {forecast.length > 0 && (
        <div className="forecast-bar">
          {forecast.slice(0, 7).map((day, i) => (
            <div key={i} className="forecast-day">
              <div className="label label--gray" style={{ marginBottom: 8 }}>
                {i === 0 ? 'Today' : format(day.date, 'EEE')}
              </div>
              <WeatherIcon code={day.weatherCode} size={20} />
              <div className="value value--xsmall" style={{ marginTop: 8 }}>{day.tempMax}°</div>
              <div className="description" style={{ fontSize: 11 }}>{day.tempMin}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
