import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

// Responsive styles
const weatherStyles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  mainContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  temperature: {
    fontSize: 'clamp(80px, 30vw, 180px)',
    fontWeight: 100,
    lineHeight: 1,
  },
  hiLo: {
    marginTop: 'clamp(8px, 2vw, 12px)',
    marginBottom: 'clamp(12px, 3vw, 16px)',
  },
  dateText: {
    fontSize: 'clamp(14px, 4vw, 18px)',
    fontWeight: 400,
    color: '#333',
    marginTop: 8,
  },
  timeText: {
    fontSize: 'clamp(20px, 6vw, 28px)',
    fontWeight: 300,
    color: '#666',
    marginTop: 8,
  },
  cityLabel: {
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    color: '#999',
    marginTop: 12,
    letterSpacing: '0.15em',
  },
  forecastBar: {
    borderTop: '1px solid #e5e5e5',
    paddingTop: 'clamp(12px, 3vw, 16px)',
    display: 'flex',
  },
  forecastDay: {
    flex: 1,
    textAlign: 'center' as const,
  },
  forecastLabel: {
    marginBottom: 6,
    fontSize: 'clamp(7px, 2vw, 9px)',
  },
  forecastTemp: {
    marginTop: 4,
    fontSize: 'clamp(9px, 2.5vw, 11px)',
  },
};

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  if (!current) {
    return <div className="flex flex--center flex-1"><span className="description">Loading weather...</span></div>;
  }

  const today = forecast[0];

  return (
    <div style={weatherStyles.container}>
      {/* Main content - centered */}
      <div style={weatherStyles.mainContent}>
        <div className="flex flex--col" style={{ alignItems: 'center' }}>
          {/* Weather Icon */}
          <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
            <WeatherIcon code={current.weatherCode} size={isMobile ? 36 : 48} />
          </div>

          {/* Temperature - BIG */}
          <div className="value" style={weatherStyles.temperature}>
            {current.temperature}°
          </div>

          {/* Hi/Lo */}
          {today && (
            <div className="flex gap--medium" style={weatherStyles.hiLo}>
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
                gap: 'clamp(4px, 1.5vw, 8px)',
                marginBottom: 'clamp(12px, 3vw, 16px)',
                padding: 'clamp(4px, 1.5vw, 6px) clamp(8px, 2.5vw, 12px)',
                borderRadius: 20,
                backgroundColor: `${current.airQuality.color}20`,
              }}
            >
              <Wind size={isMobile ? 12 : 14} style={{ color: current.airQuality.color }} />
              <span style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', fontWeight: 500, color: current.airQuality.color }}>
                AQI {current.airQuality.aqi}
              </span>
              <span style={{ fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#666' }}>
                {current.airQuality.label}
              </span>
            </div>
          )}

          {/* Day and Date */}
          <div style={weatherStyles.dateText}>
            {format(time, isMobile ? 'EEE, MMM d' : 'EEEE, MMMM d')}
          </div>

          {/* Time - smaller */}
          <div style={weatherStyles.timeText}>
            {format(time, 'h:mm a')}
          </div>

          {/* City name */}
          <div style={weatherStyles.cityLabel}>
            MELBOURNE
          </div>
        </div>
      </div>

      {/* Forecast bar - small at bottom */}
      {forecast.length > 0 && (
        <div style={weatherStyles.forecastBar}>
          {forecast.slice(1, isMobile ? 5 : 8).map((day, i) => (
            <div key={i} style={weatherStyles.forecastDay}>
              <div className="label label--gray" style={weatherStyles.forecastLabel}>
                {format(day.date, 'EEE')}
              </div>
              <WeatherIcon code={day.weatherCode} size={isMobile ? 14 : 16} />
              <div className="label" style={weatherStyles.forecastTemp}>
                {day.tempMax}°
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
