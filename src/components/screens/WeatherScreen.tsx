import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, CloudDrizzle, CloudLightning, CloudFog, Cloudy, Snowflake, CloudSun, CloudMoon, Moon } from 'lucide-react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { useSettings } from '../../contexts/SettingsContext';
import { ParticleSystem } from '../effects/ParticleSystem';

// Determine temperature condition for styling
function getTemperatureCondition(temp: number): 'freezing' | 'cold' | 'cool' | 'warm' | 'hot' {
  if (temp <= 0) return 'freezing';
  if (temp <= 10) return 'cold';
  if (temp <= 20) return 'cool';
  if (temp <= 30) return 'warm';
  return 'hot';
}

// Determine weather effect type
function getWeatherEffect(temp: number, weatherCode: number): 'frost' | 'heat' | 'rain' | 'snow' | 'steam' | 'wind' | 'normal' {
  // Snow
  if (weatherCode >= 71 && weatherCode <= 77) return 'snow';
  if (weatherCode >= 85 && weatherCode <= 86) return 'snow';
  // Rain
  if (weatherCode >= 61 && weatherCode <= 67) return 'rain';
  if (weatherCode >= 95 && weatherCode <= 99) return 'rain';
  if (weatherCode >= 80 && weatherCode <= 82) return 'rain';
  // Drizzle with wind
  if (weatherCode >= 51 && weatherCode <= 57) return 'wind';
  // Temperature based
  if (temp >= 35) return 'heat';
  if (temp >= 28) return 'steam';
  if (temp <= 0) return 'frost';
  if (temp <= 8) return 'frost';
  return 'normal';
}

// Color schemes for different temperatures
const temperatureColors = {
  freezing: { primary: '#00d4ff', glow: '#80eaff', text: '#e0f7ff' },
  cold: { primary: '#4fc3f7', glow: '#81d4fa', text: '#e1f5fe' },
  cool: { primary: '#81c784', glow: '#a5d6a7', text: '#333' },
  warm: { primary: '#ffb74d', glow: '#ffcc80', text: '#333' },
  hot: { primary: '#ff5722', glow: '#ff8a65', text: '#fff3e0' },
};

// Dynamic temperature display with weather-based particle effects
function DynamicTemperature({
  temp,
  weatherCode,
  einkMode = false,
  style = {},
}: {
  temp: number;
  weatherCode: number;
  einkMode?: boolean;
  style?: React.CSSProperties;
}) {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);

  const tempCondition = getTemperatureCondition(temp);
  const weatherEffect = einkMode ? 'normal' : getWeatherEffect(temp, weatherCode);
  const colors = temperatureColors[tempCondition];

  // Spring animation for smooth temperature changes
  const springTemp = useSpring(temp, { stiffness: 50, damping: 20 });
  const displayTemp = useTransform(springTemp, (v) => Math.round(v));
  const [animatedTemp, setAnimatedTemp] = useState(Math.round(temp));

  useEffect(() => {
    if (einkMode) return;
    const unsubscribe = displayTemp.on('change', (v) => setAnimatedTemp(v));
    return unsubscribe;
  }, [displayTemp, einkMode]);

  // Animation loop for dynamic effects
  useEffect(() => {
    if (einkMode || weatherEffect === 'normal') return;

    const animate = () => {
      setTime(performance.now());
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [weatherEffect, einkMode]);

  const text = `${animatedTemp}°`;
  const t = time / 1000;

  // Character-level animation based on weather
  const renderChars = () => {
    return text.split('').map((char, i) => {
      let charStyle: React.CSSProperties = {
        display: 'inline-block',
        transition: 'none',
      };

      switch (weatherEffect) {
        case 'wind': {
          const wobble = Math.sin(t * 3 + i * 0.8) * 8;
          const tilt = Math.sin(t * 2 + i * 1.2) * 15;
          const drift = Math.sin(t * 1.5 + i * 0.5) * 5;
          charStyle.transform = `translateX(${wobble}px) translateY(${drift}px) rotate(${tilt}deg)`;
          charStyle.opacity = 0.85 + Math.sin(t * 4 + i) * 0.15;
          break;
        }
        case 'heat': {
          const wave = Math.sin(t * 2 + i * 0.5) * 4;
          const drip = Math.sin(t * 1.5 + i * 0.3) * 5 + 3;
          const stretch = 1 + Math.sin(t + i * 0.4) * 0.08;
          charStyle.transform = `translateX(${wave}px) translateY(${drip}px) scaleY(${stretch})`;
          charStyle.filter = `blur(${Math.sin(t * 2 + i) * 0.8}px)`;
          charStyle.color = colors.primary;
          charStyle.textShadow = `0 0 30px ${colors.glow}, 0 0 60px ${colors.primary}`;
          break;
        }
        case 'steam': {
          const wave = Math.sin(t * 1.5 + i * 0.4) * 2;
          const rise = Math.sin(t + i * 0.3) * 3;
          charStyle.transform = `translateX(${wave}px) translateY(${rise}px)`;
          charStyle.color = colors.primary;
          charStyle.textShadow = `0 0 20px ${colors.glow}`;
          break;
        }
        case 'frost': {
          const shiver = Math.sin(t * 12 + i * 2) * 3;
          const shake = Math.cos(t * 10 + i * 1.5) * 1.5;
          charStyle.transform = `translateX(${shiver}px) translateY(${shake}px)`;
          charStyle.color = colors.primary;
          charStyle.textShadow = `0 0 15px ${colors.glow}, 0 0 30px ${colors.primary}, 0 0 45px ${colors.glow}`;
          break;
        }
        case 'rain': {
          const drip = Math.sin(t * 2 + i * 0.4) * 4;
          charStyle.transform = `translateY(${drip}px)`;
          charStyle.opacity = 0.85 + Math.sin(t * 3 + i) * 0.1;
          charStyle.textShadow = '0 3px 6px rgba(0, 100, 200, 0.4)';
          break;
        }
        case 'snow': {
          const float = Math.sin(t * 0.8 + i * 0.6) * 5;
          const drift = Math.cos(t * 0.5 + i * 0.8) * 4;
          charStyle.transform = `translateX(${drift}px) translateY(${float}px)`;
          charStyle.textShadow = '0 0 20px rgba(255, 255, 255, 0.9), 0 0 40px rgba(200, 230, 255, 0.5)';
          charStyle.opacity = 0.95;
          break;
        }
      }

      return (
        <motion.span
          key={i}
          style={charStyle}
          animate={{
            scale: weatherEffect === 'heat' ? [1, 1.02, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        >
          {char}
        </motion.span>
      );
    });
  };

  // Get particle type based on weather
  const getParticleType = (): 'frost' | 'heat' | 'rain' | 'snow' | 'steam' | null => {
    switch (weatherEffect) {
      case 'frost': return 'frost';
      case 'heat': return 'heat';
      case 'steam': return 'steam';
      case 'rain': return 'rain';
      case 'snow': return 'snow';
      default: return null;
    }
  };

  const particleType = getParticleType();

  // E-ink mode: simple static display
  if (einkMode) {
    return (
      <div style={{ display: 'inline-flex', ...style }}>
        {`${Math.round(temp)}°`}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', ...style }}>
      {/* Particle effects behind text */}
      {particleType && (
        <div style={{
          position: 'absolute',
          top: -40,
          left: -60,
          right: -60,
          bottom: -40,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <ParticleSystem
            type={particleType}
            width={300}
            height={200}
            intensity={weatherEffect === 'heat' || weatherEffect === 'frost' ? 1.5 : 1}
            density={weatherEffect === 'rain' ? 8 : weatherEffect === 'snow' ? 4 : 3}
          />
        </div>
      )}

      {/* Temperature text */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {weatherEffect === 'normal' ? text : renderChars()}
      </div>
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

// Get weather description from code
function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 56 && code <= 57) return 'Freezing Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code === 66 || code === 67) return 'Freezing Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code === 77) return 'Snow Grains';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code === 95) return 'Thunderstorm';
  if (code >= 96 && code <= 99) return 'Thunderstorm with Hail';
  return 'Unknown';
}

// Determine if it's daytime (simple check based on hours)
function isDaytime(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20;
}

// Large animated weather icon as the main visual
function DynamicWeatherIcon({
  code,
  temp,
  einkMode = false,
  style = {}
}: {
  code: number;
  temp: number;
  einkMode?: boolean;
  style?: React.CSSProperties;
}) {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const daytime = isDaytime();

  // Animation loop (skip in e-ink mode)
  useEffect(() => {
    if (einkMode) return;

    const animate = () => {
      setTime(performance.now());
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [einkMode]);

  const t = time / 1000;
  const iconSize = 'clamp(120px, 40vw, 200px)';

  // Get icon and animation based on weather code
  const renderWeatherIcon = () => {
    const baseStyle: React.CSSProperties = {
      width: iconSize,
      height: iconSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    // Clear sky - Sun or Moon
    if (code === 0 || code === 1) {
      if (daytime) {
        // Animated sun with rotating rays
        const rotation = t * 10;
        const pulse = 1 + Math.sin(t * 2) * 0.05;
        const glow = 20 + Math.sin(t * 1.5) * 10;
        return (
          <div style={{ ...baseStyle, position: 'relative' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sun
                size={parseInt(iconSize) || 160}
                strokeWidth={1}
                style={{
                  color: '#FFB300',
                  filter: `drop-shadow(0 0 ${glow}px #FFD54F) drop-shadow(0 0 ${glow * 2}px #FFB300)`,
                  transform: `scale(${pulse})`,
                }}
              />
            </motion.div>
          </div>
        );
      } else {
        // Animated moon
        const glow = 15 + Math.sin(t * 0.8) * 8;
        return (
          <div style={baseStyle}>
            <Moon
              size={parseInt(iconSize) || 160}
              strokeWidth={1}
              style={{
                color: '#E3F2FD',
                filter: `drop-shadow(0 0 ${glow}px #90CAF9) drop-shadow(0 0 ${glow * 1.5}px #64B5F6)`,
              }}
            />
          </div>
        );
      }
    }

    // Partly cloudy
    if (code === 2) {
      const cloudDrift = Math.sin(t * 0.5) * 10;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          {daytime ? (
            <>
              <Sun
                size={(parseInt(iconSize) || 160) * 0.6}
                strokeWidth={1.2}
                style={{
                  color: '#FFB300',
                  position: 'absolute',
                  top: '10%',
                  right: '15%',
                  filter: 'drop-shadow(0 0 15px #FFD54F)',
                }}
              />
              <Cloud
                size={(parseInt(iconSize) || 160) * 0.8}
                strokeWidth={1}
                style={{
                  color: '#90A4AE',
                  transform: `translateX(${cloudDrift}px)`,
                  filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))',
                }}
              />
            </>
          ) : (
            <>
              <Moon
                size={(parseInt(iconSize) || 160) * 0.5}
                strokeWidth={1.2}
                style={{
                  color: '#E3F2FD',
                  position: 'absolute',
                  top: '10%',
                  right: '15%',
                  filter: 'drop-shadow(0 0 10px #90CAF9)',
                }}
              />
              <Cloud
                size={(parseInt(iconSize) || 160) * 0.8}
                strokeWidth={1}
                style={{
                  color: '#607D8B',
                  transform: `translateX(${cloudDrift}px)`,
                }}
              />
            </>
          )}
        </div>
      );
    }

    // Overcast / Cloudy
    if (code === 3) {
      const drift1 = Math.sin(t * 0.4) * 8;
      const drift2 = Math.sin(t * 0.3 + 1) * 6;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          <Cloudy
            size={(parseInt(iconSize) || 160) * 0.7}
            strokeWidth={1}
            style={{
              color: '#78909C',
              position: 'absolute',
              top: '20%',
              left: '10%',
              transform: `translateX(${drift1}px)`,
              filter: 'drop-shadow(2px 4px 8px rgba(0,0,0,0.15))',
            }}
          />
          <Cloud
            size={(parseInt(iconSize) || 160) * 0.9}
            strokeWidth={1}
            style={{
              color: '#90A4AE',
              transform: `translateX(${drift2}px)`,
              filter: 'drop-shadow(3px 5px 10px rgba(0,0,0,0.1))',
            }}
          />
        </div>
      );
    }

    // Fog
    if (code >= 45 && code <= 48) {
      const wave1 = Math.sin(t * 0.5) * 15;
      const wave2 = Math.sin(t * 0.4 + 2) * 12;
      const opacity = 0.6 + Math.sin(t * 0.3) * 0.2;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          <CloudFog
            size={parseInt(iconSize) || 160}
            strokeWidth={1}
            style={{
              color: '#B0BEC5',
              opacity,
              transform: `translateX(${wave1}px)`,
              filter: 'blur(1px)',
            }}
          />
        </div>
      );
    }

    // Drizzle
    if (code >= 51 && code <= 57) {
      const drift = Math.sin(t * 0.6) * 5;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          <CloudDrizzle
            size={parseInt(iconSize) || 160}
            strokeWidth={1}
            style={{
              color: '#78909C',
              transform: `translateX(${drift}px)`,
              filter: 'drop-shadow(0 4px 8px rgba(100,181,246,0.3))',
            }}
          />
        </div>
      );
    }

    // Rain
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
      const shake = Math.sin(t * 3) * 3;
      const intensity = code >= 65 || code >= 81 ? 1.2 : 1;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          <motion.div
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <CloudRain
              size={parseInt(iconSize) || 160}
              strokeWidth={1}
              style={{
                color: '#546E7A',
                transform: `translateX(${shake}px) scale(${intensity})`,
                filter: 'drop-shadow(0 6px 12px rgba(66,165,245,0.4))',
              }}
            />
          </motion.div>
        </div>
      );
    }

    // Snow
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
      const drift = Math.sin(t * 0.4) * 8;
      const float = Math.sin(t * 0.6) * 4;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          <motion.div
            animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CloudSnow
              size={parseInt(iconSize) || 160}
              strokeWidth={1}
              style={{
                color: '#78909C',
                transform: `translateX(${drift}px)`,
                filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.8)) drop-shadow(0 4px 8px rgba(144,202,249,0.3))',
              }}
            />
          </motion.div>
        </div>
      );
    }

    // Thunderstorm
    if (code >= 95 && code <= 99) {
      const flash = Math.random() > 0.98 ? 1 : 0.7 + Math.sin(t * 2) * 0.1;
      const shake = Math.sin(t * 8) * 2;
      return (
        <div style={{ ...baseStyle, position: 'relative' }}>
          <motion.div
            animate={{
              filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
            }}
            transition={{ duration: 0.1, repeat: Infinity, repeatDelay: Math.random() * 3 + 1 }}
          >
            <CloudLightning
              size={parseInt(iconSize) || 160}
              strokeWidth={1}
              style={{
                color: '#546E7A',
                transform: `translateX(${shake}px)`,
                filter: `drop-shadow(0 0 20px rgba(255,235,59,${flash})) drop-shadow(0 6px 12px rgba(66,165,245,0.4))`,
              }}
            />
          </motion.div>
        </div>
      );
    }

    // Windy (default for drizzle with wind codes)
    const windDrift = Math.sin(t * 2) * 15;
    const tilt = Math.sin(t * 1.5) * 5;
    return (
      <div style={baseStyle}>
        <Wind
          size={parseInt(iconSize) || 160}
          strokeWidth={1}
          style={{
            color: '#78909C',
            transform: `translateX(${windDrift}px) rotate(${tilt}deg)`,
            filter: 'drop-shadow(4px 0 8px rgba(120,144,156,0.3))',
          }}
        />
      </div>
    );
  };

  // E-ink mode: simple static icon
  if (einkMode) {
    const iconSize = 120;
    const getStaticIcon = () => {
      if (code === 0 || code === 1) return daytime ? <Sun size={iconSize} strokeWidth={1} /> : <Moon size={iconSize} strokeWidth={1} />;
      if (code === 2) return daytime ? <CloudSun size={iconSize} strokeWidth={1} /> : <CloudMoon size={iconSize} strokeWidth={1} />;
      if (code === 3) return <Cloudy size={iconSize} strokeWidth={1} />;
      if (code >= 45 && code <= 48) return <CloudFog size={iconSize} strokeWidth={1} />;
      if (code >= 51 && code <= 57) return <CloudDrizzle size={iconSize} strokeWidth={1} />;
      if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={iconSize} strokeWidth={1} />;
      if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return <CloudSnow size={iconSize} strokeWidth={1} />;
      if (code >= 95 && code <= 99) return <CloudLightning size={iconSize} strokeWidth={1} />;
      return <Wind size={iconSize} strokeWidth={1} />;
    };
    return (
      <div style={{ color: '#333', ...style }}>
        {getStaticIcon()}
      </div>
    );
  }

  const weatherEffect = getWeatherEffect(temp, code);
  const particleType = (() => {
    switch (weatherEffect) {
      case 'frost': return 'frost';
      case 'heat': return 'heat';
      case 'steam': return 'steam';
      case 'rain': return 'rain';
      case 'snow': return 'snow';
      default: return null;
    }
  })();

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Particle effects behind icon */}
      {particleType && (
        <div style={{
          position: 'absolute',
          top: -60,
          left: -80,
          right: -80,
          bottom: -60,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <ParticleSystem
            type={particleType}
            width={400}
            height={320}
            intensity={1.2}
            density={weatherEffect === 'rain' ? 10 : weatherEffect === 'snow' ? 6 : 4}
          />
        </div>
      )}

      {/* Main weather icon */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {renderWeatherIcon()}
      </div>
    </div>
  );
}

export function WeatherScreen() {
  const { current, forecast } = useWeather();
  const { settings } = useSettings();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
  const einkMode = settings.einkMode;

  if (!current) {
    return <div className="flex flex--center flex-1"><span className="description">Loading weather...</span></div>;
  }

  const today = forecast[0];
  const weatherDescription = getWeatherDescription(current.weatherCode);

  return (
    <div style={weatherStyles.container}>
      {/* Main content - centered */}
      <div style={weatherStyles.mainContent}>
        <div className="flex flex--col" style={{ alignItems: 'center' }}>
          {/* Large Weather Icon - main visual */}
          <div style={{ marginBottom: 'clamp(8px, 2vw, 12px)' }}>
            <DynamicWeatherIcon
              code={current.weatherCode}
              temp={current.temperature}
              einkMode={einkMode}
            />
          </div>

          {/* Weather Description */}
          <div style={{
            fontSize: 'clamp(14px, 4vw, 20px)',
            fontWeight: 300,
            color: '#666',
            letterSpacing: '0.05em',
            marginBottom: 'clamp(8px, 2vw, 12px)',
          }}>
            {weatherDescription}
          </div>

          {/* Temperature - still prominent with weather effects */}
          <div className="value" style={{
            ...weatherStyles.temperature,
            fontSize: 'clamp(60px, 22vw, 140px)',
          }}>
            <DynamicTemperature
              temp={current.temperature}
              weatherCode={current.weatherCode}
              einkMode={einkMode}
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
