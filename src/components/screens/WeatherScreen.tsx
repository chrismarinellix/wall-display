import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow } from 'lucide-react';
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
        <div className="flex gap--xxlarge" style={{ alignItems: 'center' }}>
          {/* Time */}
          <div className="value" style={{ fontSize: 140, fontWeight: 200 }}>
            {format(time, 'h:mm')}
          </div>

          {/* Divider */}
          <div style={{ width: 2, height: 120, background: '#e5e5e5' }} />

          {/* Temperature */}
          <div className="flex flex--col" style={{ alignItems: 'center' }}>
            <div className="flex gap--medium" style={{ alignItems: 'center' }}>
              <WeatherIcon code={current.weatherCode} size={48} />
              <div className="value" style={{ fontSize: 140, fontWeight: 200 }}>
                {current.temperature}°
              </div>
            </div>
            {/* Hi/Lo */}
            {today && (
              <div className="flex gap--medium" style={{ marginTop: 8 }}>
                <span className="label">H: {today.tempMax}°</span>
                <span className="label label--gray">L: {today.tempMin}°</span>
              </div>
            )}
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
