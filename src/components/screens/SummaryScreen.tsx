import { useState, useEffect, useCallback } from 'react';
import { Fan, Power, Lightbulb, Sun } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { useNews } from '../../hooks/useNews';
import { generateDailySummary } from '../../services/aiService';
import { weatherCodeToDescription } from '../../types/weather';

// Entity interfaces
interface FanEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    percentage?: number;
    preset_mode?: string;
    preset_modes?: string[];
    percentage_step?: number;
  };
}

interface LightEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
    color_mode?: string;
  };
}

// Light Control Component
function LightControl({ light, onToggle, onSetBrightness }: {
  light: LightEntity;
  onToggle: () => void;
  onSetBrightness: (brightness: number) => void;
}) {
  const isOn = light.state === 'on';
  const brightness = light.attributes.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '16px 24px',
        background: isOn ? 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)' : '#fafafa',
        borderRadius: 12,
        border: isOn ? '1px solid #fde047' : '1px solid #e5e5e5',
        transition: 'all 0.3s ease',
        flex: 1,
      }}
    >
      {/* Light Icon */}
      <div
        onClick={onToggle}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: isOn ? '#eab308' : '#e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isOn ? '0 4px 12px rgba(234, 179, 8, 0.3)' : 'none',
        }}
      >
        <Lightbulb
          size={24}
          color={isOn ? '#fff' : '#999'}
          fill={isOn ? '#fff' : 'none'}
        />
      </div>

      {/* Light Info */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          marginBottom: 4,
        }}>
          {light.attributes.friendly_name || light.entity_id.split('.')[1]}
        </div>
        <div style={{
          fontSize: 11,
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {isOn ? `${brightnessPercent}%` : 'Off'}
        </div>
      </div>

      {/* Brightness Slider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        maxWidth: 200,
      }}>
        <Sun size={14} color="#999" />
        <input
          type="range"
          min="0"
          max="255"
          value={brightness}
          onChange={(e) => onSetBrightness(parseInt(e.target.value))}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            appearance: 'none',
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${brightnessPercent}%, #ddd ${brightnessPercent}%, #ddd 100%)`,
            cursor: 'pointer',
            opacity: isOn ? 1 : 0.5,
          }}
        />
        <Sun size={18} color={isOn ? '#eab308' : '#999'} />
      </div>

      {/* Power Button */}
      <button
        onClick={onToggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: isOn ? '#ef4444' : '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginLeft: 8,
        }}
        title={isOn ? 'Turn Off' : 'Turn On'}
      >
        <Power size={16} color="#fff" />
      </button>
    </div>
  );
}

// Fan Control Component
function FanControl({ fan, onToggle, onSetSpeed }: {
  fan: FanEntity;
  onToggle: () => void;
  onSetSpeed: (percentage: number) => void;
}) {
  const isOn = fan.state === 'on';
  const percentage = fan.attributes.percentage || 0;
  const speedStep = fan.attributes.percentage_step || 14.29; // ~7 speeds
  const currentSpeed = Math.round(percentage / speedStep);
  const maxSpeed = Math.round(100 / speedStep);

  const speeds = Array.from({ length: maxSpeed }, (_, i) => i + 1);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '16px 24px',
        background: isOn ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#fafafa',
        borderRadius: 12,
        border: isOn ? '1px solid #86efac' : '1px solid #e5e5e5',
        transition: 'all 0.3s ease',
        flex: 1,
      }}
    >
      {/* Fan Icon with animation */}
      <div
        onClick={onToggle}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: isOn ? '#22c55e' : '#e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isOn ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none',
        }}
      >
        <Fan
          size={24}
          color={isOn ? '#fff' : '#999'}
          style={{
            animation: isOn ? `spin ${2 - (percentage / 100) * 1.5}s linear infinite` : 'none',
          }}
        />
      </div>

      {/* Fan Info */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          marginBottom: 4,
        }}>
          {fan.attributes.friendly_name || fan.entity_id.split('.')[1]}
        </div>
        <div style={{
          fontSize: 11,
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {isOn ? `Speed ${currentSpeed}/${maxSpeed}` : 'Off'}
        </div>
      </div>

      {/* Speed Control */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        {speeds.map((speed) => {
          const speedPercent = speed * speedStep;
          const isActive = isOn && currentSpeed >= speed;
          return (
            <button
              key={speed}
              onClick={() => onSetSpeed(speedPercent)}
              style={{
                width: 8,
                height: 12 + speed * 4,
                borderRadius: 2,
                border: 'none',
                background: isActive ? '#22c55e' : '#ddd',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isOn ? 1 : 0.5,
              }}
              title={`Speed ${speed}`}
            />
          );
        })}
      </div>

      {/* Power Button */}
      <button
        onClick={onToggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: isOn ? '#ef4444' : '#22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginLeft: 8,
        }}
        title={isOn ? 'Turn Off' : 'Turn On'}
      >
        <Power size={16} color="#fff" />
      </button>
    </div>
  );
}

// Home Controls Bar Component (Fans + Lights)
function HomeControlsBar() {
  const [fans, setFans] = useState<FanEntity[]>([]);
  const [lights, setLights] = useState<LightEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const haUrl = import.meta.env.VITE_HOME_ASSISTANT_URL;
  const haToken = import.meta.env.VITE_HOME_ASSISTANT_TOKEN;

  const fetchEntities = useCallback(async () => {
    if (!haUrl || !haToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${haUrl}/api/states`, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) return;

      const data: (FanEntity | LightEntity)[] = await response.json();
      const fanEntities = data.filter(e => e.entity_id.startsWith('fan.')) as FanEntity[];
      const lightEntities = data.filter(e => e.entity_id.startsWith('light.')) as LightEntity[];
      setFans(fanEntities);
      setLights(lightEntities);
    } catch (e) {
      console.error('Failed to fetch entities:', e);
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken]);

  const toggleFan = async (entityId: string) => {
    if (!haUrl || !haToken) return;

    try {
      await fetch(`${haUrl}/api/services/fan/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId }),
      });
      setTimeout(fetchEntities, 300);
    } catch (e) {
      console.error('Failed to toggle fan:', e);
    }
  };

  const setFanSpeed = async (entityId: string, percentage: number) => {
    if (!haUrl || !haToken) return;

    try {
      const fan = fans.find(f => f.entity_id === entityId);
      if (fan?.state === 'off') {
        await fetch(`${haUrl}/api/services/fan/turn_on`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${haToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entity_id: entityId }),
        });
      }

      await fetch(`${haUrl}/api/services/fan/set_percentage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId, percentage }),
      });
      setTimeout(fetchEntities, 300);
    } catch (e) {
      console.error('Failed to set fan speed:', e);
    }
  };

  const toggleLight = async (entityId: string) => {
    if (!haUrl || !haToken) return;

    try {
      await fetch(`${haUrl}/api/services/light/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId }),
      });
      setTimeout(fetchEntities, 300);
    } catch (e) {
      console.error('Failed to toggle light:', e);
    }
  };

  const setLightBrightness = async (entityId: string, brightness: number) => {
    if (!haUrl || !haToken) return;

    try {
      if (brightness === 0) {
        await fetch(`${haUrl}/api/services/light/turn_off`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${haToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entity_id: entityId }),
        });
      } else {
        await fetch(`${haUrl}/api/services/light/turn_on`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${haToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entity_id: entityId, brightness }),
        });
      }
      setTimeout(fetchEntities, 300);
    } catch (e) {
      console.error('Failed to set light brightness:', e);
    }
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 15000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  if (!haUrl || !haToken || (fans.length === 0 && lights.length === 0)) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <div
      style={{
        padding: '16px 48px',
        background: '#fff',
        borderTop: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Fans Row */}
      {fans.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 70,
            }}
          >
            <Fan size={16} color="#666" />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#999',
              }}
            >
              Fans
            </span>
          </div>
          <div style={{ display: 'flex', flex: 1, gap: 12 }}>
            {fans.map(fan => (
              <FanControl
                key={fan.entity_id}
                fan={fan}
                onToggle={() => toggleFan(fan.entity_id)}
                onSetSpeed={(pct) => setFanSpeed(fan.entity_id, pct)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lights Row */}
      {lights.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 70,
            }}
          >
            <Lightbulb size={16} color="#666" />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#999',
              }}
            >
              Lights
            </span>
          </div>
          <div style={{ display: 'flex', flex: 1, gap: 12 }}>
            {lights.map(light => (
              <LightControl
                key={light.entity_id}
                light={light}
                onToggle={() => toggleLight(light.entity_id)}
                onSetBrightness={(b) => setLightBrightness(light.entity_id, b)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Summary {
  greeting: string;
  weatherSummary: string;
  daySummary: string;
  marketSummary: string;
  newsSummary: string;
  advice: string;
}

export function SummaryScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { current: weather, forecast } = useWeather();
  const { events } = useCalendar();
  const { crypto } = useStocks();
  const { items: news } = useNews();

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const generateSummary = useCallback(async () => {
    if (!groqApiKey) {
      setError('Groq API key not configured. Add VITE_GROQ_API_KEY to your environment.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        weather: weather ? {
          temperature: weather.temperature,
          condition: weatherCodeToDescription[weather.weatherCode] || 'Unknown',
          forecast: forecast.slice(0, 3).map(f =>
            `${f.date.toLocaleDateString('en-US', { weekday: 'short' })}: ${f.tempMax}°/${f.tempMin}°`
          ),
        } : undefined,
        calendar: {
          events: events.slice(0, 5).map(e => ({
            title: e.title,
            time: e.allDay ? 'All day' : e.start.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            }),
            isAllDay: e.allDay,
          })),
        },
        stocks: {
          crypto: crypto.map(c => ({
            name: c.name,
            price: c.price,
            change: c.change24h,
          })),
        },
        news: news.slice(0, 5).map(n => ({
          title: n.title,
          source: n.source,
        })),
      };

      const result = await generateDailySummary(data, groqApiKey);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [weather, forecast, events, crypto, news, groqApiKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateSummary();
    }, 2000);
    return () => clearTimeout(timer);
  }, [generateSummary]);

  useEffect(() => {
    const interval = setInterval(generateSummary, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [generateSummary]);

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (loading && !summary) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #eee',
            borderTopColor: '#000',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: 24, color: '#999', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Preparing briefing
        </p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
          {error}
        </div>
        <button
          onClick={generateSummary}
          style={{
            marginTop: 24,
            padding: '12px 32px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: '#000',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Hero Header */}
      <div
        style={{
          padding: '40px 48px 32px',
          background: '#000',
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 200,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {timeStr}
          </div>
          <div
            style={{
              textAlign: 'right',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: 4,
              }}
            >
              Daily Briefing
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 400,
                opacity: 0.8,
              }}
            >
              {dateStr}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 300,
            lineHeight: 1.4,
            opacity: 0.95,
            maxWidth: 600,
          }}
        >
          {summary?.greeting || 'Welcome to your daily briefing.'}
        </div>
      </div>

      {/* Content Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: '1fr 1fr',
          overflow: 'hidden',
        }}
      >
        <SummaryCard
          number="01"
          label="Weather"
          content={summary?.weatherSummary || 'Weather data loading...'}
          position="top-left"
        />
        <SummaryCard
          number="02"
          label="Schedule"
          content={summary?.daySummary || 'Calendar data loading...'}
          position="top-right"
        />
        <SummaryCard
          number="03"
          label="Markets"
          content={summary?.marketSummary || 'Market data loading...'}
          position="bottom-left"
        />
        <SummaryCard
          number="04"
          label="Headlines"
          content={summary?.newsSummary || 'News loading...'}
          position="bottom-right"
        />
      </div>

      {/* Fan Controls */}
      <HomeControlsBar />

      {/* Footer Advice */}
      <div
        style={{
          padding: '20px 48px',
          background: '#fafafa',
          borderTop: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 4,
            height: 4,
            background: '#000',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: '#333',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {summary?.advice || 'Have a productive day ahead.'}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  number,
  label,
  content,
  position,
}: {
  number: string;
  label: string;
  content: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const borderStyles: Record<string, React.CSSProperties> = {
    'top-left': { borderRight: '1px solid #eee', borderBottom: '1px solid #eee' },
    'top-right': { borderBottom: '1px solid #eee' },
    'bottom-left': { borderRight: '1px solid #eee' },
    'bottom-right': {},
  };

  return (
    <div
      style={{
        background: '#fff',
        padding: '28px 36px',
        display: 'flex',
        flexDirection: 'column',
        ...borderStyles[position],
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#ccc',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {number}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#000',
          }}
        >
          {label}
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          color: '#444',
          fontWeight: 400,
          flex: 1,
        }}
      >
        {content}
      </div>
    </div>
  );
}
