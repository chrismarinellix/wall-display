import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

// Dynamic temperature display with weather-based effects
function DynamicTemperature({
  temp,
  weatherCode,
  style = {},
}: {
  temp: number;
  weatherCode: number;
  style?: React.CSSProperties;
}) {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Determine weather effect type
  const effectType = useMemo(() => {
    // Windy conditions (weather codes with wind)
    if (weatherCode >= 51 && weatherCode <= 57) return 'windy'; // Drizzle with wind
    if (weatherCode >= 80 && weatherCode <= 82) return 'windy'; // Rain showers

    // Hot (temp > 30°C)
    if (temp >= 30) return 'hot';

    // Cold (temp < 5°C)
    if (temp <= 5) return 'cold';

    // Rainy
    if (weatherCode >= 61 && weatherCode <= 67) return 'rainy';
    if (weatherCode >= 95 && weatherCode <= 99) return 'rainy'; // Thunderstorm

    // Snowy
    if (weatherCode >= 71 && weatherCode <= 77) return 'snowy';
    if (weatherCode >= 85 && weatherCode <= 86) return 'snowy';

    return 'normal';
  }, [temp, weatherCode]);

  // Animation loop for dynamic effects
  useEffect(() => {
    if (effectType === 'normal') return;

    const animate = () => {
      setTime(performance.now());
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [effectType]);

  const text = `${Math.round(temp)}°`;
  const t = time / 1000; // seconds

  // Generate character-level effects
  const renderChars = () => {
    return text.split('').map((char, i) => {
      let charStyle: React.CSSProperties = {
        display: 'inline-block',
        transition: 'none',
      };

      switch (effectType) {
        case 'windy': {
          // Characters blown by wind - wobble and tilt
          const wobble = Math.sin(t * 3 + i * 0.8) * 8;
          const tilt = Math.sin(t * 2 + i * 1.2) * 15;
          const drift = Math.sin(t * 1.5 + i * 0.5) * 5;
          charStyle.transform = `translateX(${wobble}px) translateY(${drift}px) rotate(${tilt}deg)`;
          charStyle.opacity = 0.85 + Math.sin(t * 4 + i) * 0.15;
          break;
        }
        case 'hot': {
          // Melting effect - wavy, dripping downward
          const wave = Math.sin(t * 2 + i * 0.5) * 3;
          const drip = Math.sin(t * 1.5 + i * 0.3) * 4 + 2;
          const stretch = 1 + Math.sin(t + i * 0.4) * 0.05;
          charStyle.transform = `translateX(${wave}px) translateY(${drip}px) scaleY(${stretch})`;
          charStyle.filter = `blur(${Math.sin(t * 2 + i) * 0.5}px)`;
          charStyle.opacity = 0.9;
          break;
        }
        case 'cold': {
          // Shivering/frosted effect
          const shiver = Math.sin(t * 15 + i * 2) * 2;
          const shake = Math.cos(t * 12 + i * 1.5) * 1;
          charStyle.transform = `translateX(${shiver}px) translateY(${shake}px)`;
          charStyle.textShadow = '0 0 10px rgba(100, 180, 255, 0.5), 0 0 20px rgba(100, 180, 255, 0.3)';
          break;
        }
        case 'rainy': {
          // Slight drip and blur
          const drip = Math.sin(t * 2 + i * 0.4) * 3;
          charStyle.transform = `translateY(${drip}px)`;
          charStyle.opacity = 0.85 + Math.sin(t * 3 + i) * 0.1;
          charStyle.textShadow = '0 2px 4px rgba(0, 100, 200, 0.3)';
          break;
        }
        case 'snowy': {
          // Gentle floating/snowfall effect
          const float = Math.sin(t * 0.8 + i * 0.6) * 4;
          const drift = Math.cos(t * 0.5 + i * 0.8) * 3;
          charStyle.transform = `translateX(${drift}px) translateY(${float}px)`;
          charStyle.textShadow = '0 0 15px rgba(255, 255, 255, 0.8)';
          charStyle.opacity = 0.95;
          break;
        }
      }

      return (
        <span key={i} style={charStyle}>
          {char}
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'inline-flex', ...style }}>
      {effectType === 'normal' ? text : renderChars()}
    </div>
  );
}

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

          {/* Temperature - BIG with weather effects */}
          <div className="value" style={weatherStyles.temperature}>
            <DynamicTemperature
              temp={current.temperature}
              weatherCode={current.weatherCode}
            />
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
