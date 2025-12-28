import { useState, useEffect, useCallback } from 'react';
import { Fan, Power, Lightbulb, Sun, AlertCircle } from 'lucide-react';

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

// Fan Control Component (same design as SummaryScreen)
function FanControl({ fan, onToggle, onSetSpeed }: {
  fan: FanEntity;
  onToggle: () => void;
  onSetSpeed: (percentage: number) => void;
}) {
  const isOn = fan.state === 'on';
  const percentage = fan.attributes.percentage || 0;
  const speedStep = fan.attributes.percentage_step || 14.29;
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

// Light Control Component (same design as SummaryScreen)
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

export function HomeAssistantScreen() {
  const [fans, setFans] = useState<FanEntity[]>([]);
  const [lights, setLights] = useState<LightEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const haUrl = import.meta.env.VITE_HOME_ASSISTANT_URL;
  const haToken = import.meta.env.VITE_HOME_ASSISTANT_TOKEN;

  const fetchEntities = useCallback(async () => {
    if (!haUrl || !haToken) {
      setError('Home Assistant not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${haUrl}/api/states`, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Get only the two fans we care about
      const fanEntities = data.filter((e: FanEntity) =>
        e.entity_id.startsWith('fan.')
      ) as FanEntity[];

      // Get lights that match the fan names (for fan lights)
      const lightEntities = data.filter((e: LightEntity) =>
        e.entity_id.startsWith('light.')
      ) as LightEntity[];

      setFans(fanEntities.slice(0, 2)); // Only first 2 fans
      setLights(lightEntities);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
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
      console.error('Failed to set brightness:', e);
    }
  };

  // Find the matching light for a fan
  const getLightForFan = (fan: FanEntity): LightEntity | null => {
    const fanName = (fan.attributes.friendly_name || '').toLowerCase();
    return lights.find(light => {
      const lightName = (light.attributes.friendly_name || '').toLowerCase();
      // Match "Master Bedroom Fan" with "Master Bedroom Fan Light" or similar
      const baseName = fanName.replace(' fan', '').trim();
      return lightName.includes(baseName);
    }) || null;
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 15000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  if (!haUrl || !haToken) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        color: '#666',
      }}>
        <AlertCircle size={32} color="#999" />
        <span style={{ fontSize: 14 }}>Home Assistant not configured</span>
      </div>
    );
  }

  if (loading && fans.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
      }}>
        <Fan size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: '#666',
      }}>
        <AlertCircle size={24} color="#999" />
        <span style={{ fontSize: 13 }}>{error}</span>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 48px',
      gap: 24,
      background: '#fff',
    }}>
      {/* CSS for spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {fans.map((fan) => {
        const light = getLightForFan(fan);
        const fanName = (fan.attributes.friendly_name || fan.entity_id.split('.')[1])
          .replace(' Fan', '')
          .replace(' fan', '');

        return (
          <div key={fan.entity_id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Fan name header */}
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#999',
              paddingLeft: 4,
            }}>
              {fanName}
            </div>

            {/* Fan Control */}
            <FanControl
              fan={fan}
              onToggle={() => toggleFan(fan.entity_id)}
              onSetSpeed={(pct) => setFanSpeed(fan.entity_id, pct)}
            />

            {/* Light Control (if exists) */}
            {light && (
              <LightControl
                light={light}
                onToggle={() => toggleLight(light.entity_id)}
                onSetBrightness={(b) => setLightBrightness(light.entity_id, b)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
