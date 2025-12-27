import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  const props = { size, strokeWidth: 1.5 };
  if (code === 0 || code === 1) return <Sun {...props} />;
  if (code >= 61 && code <= 67) return <CloudRain {...props} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...props} />;
  return <Cloud {...props} />;
}

export function WeatherScreen() {
  const { current, forecast } = useWeather();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!current) {
    return <div className="flex flex--center flex-1"><span className="description">Loading weather...</span></div>;
  }

  const today = forecast[0];

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Main content - centered */}
      <div className="flex flex--center flex-1">
        <div className="flex flex--col" style={{ alignItems: 'center' }}>
          {/* Weather Icon */}
          <div style={{ marginBottom: 16 }}>
            <WeatherIcon code={current.weatherCode} size={48} />
          </div>

          {/* Temperature - BIG */}
          <div className="value" style={{ fontSize: 180, fontWeight: 100, lineHeight: 1 }}>
            {current.temperature}°
          </div>

          {/* Hi/Lo */}
          {today && (
            <div className="flex gap--medium" style={{ marginTop: 12, marginBottom: 16 }}>
              <span className="label">H: {today.tempMax}°</span>
              <span className="label label--gray">L: {today.tempMin}°</span>
            </div>
          )}

          {/* Air Quality */}
          {current.airQuality && (
            <div
              className="flex"
              style={{
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
                padding: '6px 12px',
                borderRadius: 20,
                backgroundColor: `${current.airQuality.color}20`,
              }}
            >
              <Wind size={14} style={{ color: current.airQuality.color }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: current.airQuality.color }}>
                AQI {current.airQuality.aqi}
              </span>
              <span style={{ fontSize: 11, color: '#666' }}>
                {current.airQuality.label}
              </span>
            </div>
          )}

          {/* Day and Date */}
          <div style={{ fontSize: 18, fontWeight: 400, color: '#333', marginTop: 8 }}>
            {format(time, 'EEEE, MMMM d')}
          </div>

          {/* Time - smaller */}
          <div style={{ fontSize: 28, fontWeight: 300, color: '#666', marginTop: 8 }}>
            {format(time, 'h:mm a')}
          </div>

          {/* City name */}
          <div style={{ fontSize: 12, color: '#999', marginTop: 12, letterSpacing: '0.15em' }}>
            MELBOURNE
          </div>
        </div>
      </div>

      {/* Forecast bar - small at bottom */}
      {forecast.length > 0 && (
        <div className="flex" style={{ borderTop: '1px solid #e5e5e5', paddingTop: 16 }}>
          {forecast.slice(1, 8).map((day, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div className="label label--gray" style={{ marginBottom: 6, fontSize: 9 }}>
                {format(day.date, 'EEE')}
              </div>
              <WeatherIcon code={day.weatherCode} size={16} />
              <div className="label" style={{ marginTop: 4, fontSize: 11 }}>
                {day.tempMax}°
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
