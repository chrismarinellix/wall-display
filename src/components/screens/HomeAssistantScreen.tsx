import { useState, useEffect, useCallback } from 'react';
import { Fan, Lightbulb, AlertCircle } from 'lucide-react';

interface FanEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    percentage?: number;
    percentage_step?: number;
  };
}

interface LightEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    brightness?: number;
  };
}

interface FanWithLight {
  fan: FanEntity;
  light: LightEntity | null;
  name: string;
}

function FanCard({
  data,
  onToggleFan,
  onSetSpeed,
  onToggleLight,
  onSetBrightness,
}: {
  data: FanWithLight;
  onToggleFan: () => void;
  onSetSpeed: (pct: number) => void;
  onToggleLight: () => void;
  onSetBrightness: (b: number) => void;
}) {
  const { fan, light, name } = data;
  const fanIsOn = fan.state === 'on';
  const lightIsOn = light?.state === 'on';
  const fanSpeed = fan.attributes.percentage || 0;
  const currentSpeed = Math.round(fanSpeed / 14.29);
  const brightness = light?.attributes.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: '24px 16px',
      flex: 1,
      minWidth: 160,
    }}>
      {/* Title */}
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#555',
      }}>
        {name}
      </div>

      {/* Fan Icon */}
      <div
        onClick={onToggleFan}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: fanIsOn
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
            : '#111',
          border: fanIsOn ? '2px solid #444' : '2px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: fanIsOn
            ? '0 0 30px rgba(255,255,255,0.04)'
            : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        <Fan
          size={32}
          color={fanIsOn ? '#fff' : '#333'}
          strokeWidth={1.5}
          style={{
            animation: fanIsOn ? `spin ${2.5 - (fanSpeed / 100) * 2}s linear infinite` : 'none',
          }}
        />
      </div>

      {/* Speed Label */}
      <div style={{
        fontSize: 18,
        fontWeight: 200,
        color: fanIsOn ? '#fff' : '#333',
        letterSpacing: '0.05em',
      }}>
        {fanIsOn ? `Speed ${currentSpeed}` : 'Off'}
      </div>

      {/* Speed Bars */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 5,
        height: 40,
      }}>
        {[1, 2, 3, 4, 5, 6, 7].map((speed) => {
          const isActive = fanIsOn && currentSpeed >= speed;
          const height = 10 + speed * 4;
          return (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed * 14.29)}
              style={{
                width: 8,
                height,
                borderRadius: 3,
                border: 'none',
                background: isActive
                  ? 'linear-gradient(180deg, #666 0%, #333 100%)'
                  : '#1a1a1a',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isActive ? 1 : 0.5,
              }}
            />
          );
        })}
      </div>

      {/* Light Control */}
      {light && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          marginTop: 8,
        }}>
          <div
            onClick={onToggleLight}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: lightIsOn ? '#2a2a1a' : '#111',
              border: lightIsOn ? '1px solid #444422' : '1px solid #222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Lightbulb
              size={16}
              color={lightIsOn ? '#aa9944' : '#333'}
              fill={lightIsOn ? '#aa9944' : 'none'}
              strokeWidth={1.5}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 8,
              color: '#444',
              letterSpacing: '0.1em',
            }}>
              <span>LIGHT</span>
              <span>{lightIsOn ? `${brightnessPercent}%` : 'OFF'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={brightness}
              onChange={(e) => onSetBrightness(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: 3,
                borderRadius: 2,
                appearance: 'none',
                background: `linear-gradient(to right, #444 0%, #444 ${brightnessPercent}%, #1a1a1a ${brightnessPercent}%, #1a1a1a 100%)`,
                cursor: 'pointer',
                opacity: lightIsOn ? 1 : 0.4,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function HomeAssistantScreen() {
  const [fansWithLights, setFansWithLights] = useState<FanWithLight[]>([]);
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
      const response = await fetch(`${haUrl}/api/states`, {
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Find all fans
      const fans = data.filter((e: FanEntity) => e.entity_id.startsWith('fan.')) as FanEntity[];
      const lights = data.filter((e: LightEntity) => e.entity_id.startsWith('light.')) as LightEntity[];

      // Match each fan with its light
      const matched: FanWithLight[] = fans.map((fan) => {
        const fanName = fan.attributes.friendly_name || fan.entity_id.split('.')[1];
        const baseName = fanName.toLowerCase().replace(' fan', '').replace('_fan', '').trim();

        // Find matching light
        const matchingLight = lights.find((light) => {
          const lightName = (light.attributes.friendly_name || light.entity_id).toLowerCase();
          return lightName.includes(baseName) || lightName.includes(baseName.replace(' ', '_'));
        });

        return {
          fan,
          light: matchingLight || null,
          name: fanName.replace(' Fan', '').replace(' fan', '').replace('_fan', '').replace('_', ' '),
        };
      });

      setFansWithLights(matched);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken]);

  const toggleFan = async (entityId: string) => {
    if (!haUrl || !haToken) return;
    await fetch(`${haUrl}/api/services/fan/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId }),
    });
    setTimeout(fetchEntities, 300);
  };

  const setFanSpeed = async (entityId: string, percentage: number) => {
    if (!haUrl || !haToken) return;
    const fan = fansWithLights.find(f => f.fan.entity_id === entityId)?.fan;
    if (fan?.state === 'off') {
      await fetch(`${haUrl}/api/services/fan/turn_on`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entityId }),
      });
    }
    await fetch(`${haUrl}/api/services/fan/set_percentage`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, percentage }),
    });
    setTimeout(fetchEntities, 300);
  };

  const toggleLight = async (entityId: string) => {
    if (!haUrl || !haToken) return;
    await fetch(`${haUrl}/api/services/light/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId }),
    });
    setTimeout(fetchEntities, 300);
  };

  const setLightBrightness = async (entityId: string, brightness: number) => {
    if (!haUrl || !haToken) return;
    const service = brightness === 0 ? 'turn_off' : 'turn_on';
    await fetch(`${haUrl}/api/services/light/${service}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, ...(brightness > 0 && { brightness }) }),
    });
    setTimeout(fetchEntities, 300);
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 15000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  if (!haUrl || !haToken) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <AlertCircle size={32} color="#444" />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <Fan size={32} color="#333" style={{ animation: 'spin 2s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || fansWithLights.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', gap: 12 }}>
        <AlertCircle size={24} color="#444" />
        <span style={{ fontSize: 12, color: '#444' }}>{error || 'No fans found'}</span>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Fans Grid */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        gap: 8,
      }}>
        {fansWithLights.map((data) => (
          <FanCard
            key={data.fan.entity_id}
            data={data}
            onToggleFan={() => toggleFan(data.fan.entity_id)}
            onSetSpeed={(pct) => setFanSpeed(data.fan.entity_id, pct)}
            onToggleLight={() => data.light && toggleLight(data.light.entity_id)}
            onSetBrightness={(b) => data.light && setLightBrightness(data.light.entity_id, b)}
          />
        ))}
      </div>
    </div>
  );
}
