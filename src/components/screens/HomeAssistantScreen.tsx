import { useState, useEffect, useCallback } from 'react';
import { Fan, Lightbulb, AlertCircle, Thermometer, Wind, Leaf } from 'lucide-react';

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

interface SensorEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    unit_of_measurement?: string;
  };
}

interface SwitchEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
  };
}

interface FanWithExtras {
  fan: FanEntity;
  light: LightEntity | null;
  temperature: SensorEntity | null;
  whoosh: SwitchEntity | null;
  ecoMode: SwitchEntity | null;
  name: string;
}

function FanCard({
  data,
  onToggleFan,
  onSetSpeed,
  onToggleLight,
  onSetBrightness,
  onToggleWhoosh,
  onToggleEco,
}: {
  data: FanWithExtras;
  onToggleFan: () => void;
  onSetSpeed: (pct: number) => void;
  onToggleLight: () => void;
  onSetBrightness: (b: number) => void;
  onToggleWhoosh: () => void;
  onToggleEco: () => void;
}) {
  const { fan, light, temperature, whoosh, ecoMode, name } = data;
  const fanIsOn = fan.state === 'on';
  const lightIsOn = light?.state === 'on';
  const fanSpeed = fan.attributes.percentage || 0;
  const currentSpeed = Math.round(fanSpeed / 14.29);
  const brightness = light?.attributes.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);
  const temp = temperature?.state ? parseFloat(temperature.state) : null;
  const whooshOn = whoosh?.state === 'on';
  const ecoOn = ecoMode?.state === 'on';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: '20px 16px',
      flex: 1,
      minWidth: 180,
      maxWidth: 240,
    }}>
      {/* Title with Temperature */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: '#555',
        }}>
          {name}
        </span>
        {temp !== null && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 11,
            color: '#666',
            background: '#1a1a1a',
            padding: '2px 6px',
            borderRadius: 4,
          }}>
            <Thermometer size={10} />
            {temp.toFixed(1)}°
          </span>
        )}
      </div>

      {/* Fan Icon */}
      <div
        onClick={onToggleFan}
        style={{
          width: 72,
          height: 72,
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
          size={28}
          color={fanIsOn ? '#fff' : '#333'}
          strokeWidth={1.5}
          style={{
            animation: fanIsOn ? `spin ${2.5 - (fanSpeed / 100) * 2}s linear infinite` : 'none',
          }}
        />
      </div>

      {/* Speed Label */}
      <div style={{
        fontSize: 16,
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
        gap: 4,
        height: 36,
      }}>
        {[1, 2, 3, 4, 5, 6, 7].map((speed) => {
          const isActive = fanIsOn && currentSpeed >= speed;
          const height = 8 + speed * 4;
          return (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed * 14.29)}
              style={{
                width: 7,
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

      {/* Feature toggles */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 4,
      }}>
        {whoosh && (
          <button
            onClick={onToggleWhoosh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: whooshOn ? '#2a2a2a' : '#111',
              border: whooshOn ? '1px solid #444' : '1px solid #222',
              borderRadius: 6,
              cursor: 'pointer',
              color: whooshOn ? '#fff' : '#444',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
            title="Whoosh mode - natural breeze effect"
          >
            <Wind size={12} />
            WHOOSH
          </button>
        )}
        {ecoMode && (
          <button
            onClick={onToggleEco}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: ecoOn ? '#1a2a1a' : '#111',
              border: ecoOn ? '1px solid #2a4a2a' : '1px solid #222',
              borderRadius: 6,
              cursor: 'pointer',
              color: ecoOn ? '#4a4' : '#444',
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
            title="Eco mode - energy saving"
          >
            <Leaf size={12} />
            ECO
          </button>
        )}
      </div>

      {/* Light Control */}
      {light && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          marginTop: 8,
        }}>
          <div
            onClick={onToggleLight}
            style={{
              width: 32,
              height: 32,
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
              size={14}
              color={lightIsOn ? '#aa9944' : '#333'}
              fill={lightIsOn ? '#aa9944' : 'none'}
              strokeWidth={1.5}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
  const [fansWithExtras, setFansWithExtras] = useState<FanWithExtras[]>([]);
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

      // Find all entities by type
      const fans = data.filter((e: FanEntity) => e.entity_id.startsWith('fan.'));
      const lights = data.filter((e: LightEntity) => e.entity_id.startsWith('light.'));
      const sensors = data.filter((e: SensorEntity) => e.entity_id.startsWith('sensor.'));
      const switches = data.filter((e: SwitchEntity) => e.entity_id.startsWith('switch.'));

      // Match each fan with its extras
      const matched: FanWithExtras[] = fans.map((fan: FanEntity) => {
        const fanName = fan.attributes.friendly_name || fan.entity_id.split('.')[1];
        const baseName = fanName.toLowerCase().replace(' fan', '').replace('_fan', '').replace('fan.', '').trim();
        const baseId = fan.entity_id.split('.')[1];

        // Find matching entities
        const matchingLight = lights.find((l: LightEntity) =>
          l.entity_id.toLowerCase().includes(baseId)
        );

        const matchingTemp = sensors.find((s: SensorEntity) =>
          s.entity_id.toLowerCase().includes(baseId) &&
          s.entity_id.includes('temperature')
        );

        const matchingWhoosh = switches.find((s: SwitchEntity) =>
          s.entity_id.toLowerCase().includes(baseId) &&
          s.entity_id.includes('whoosh')
        );

        const matchingEco = switches.find((s: SwitchEntity) =>
          s.entity_id.toLowerCase().includes(baseId) &&
          s.entity_id.includes('eco')
        );

        return {
          fan,
          light: matchingLight || null,
          temperature: matchingTemp || null,
          whoosh: matchingWhoosh || null,
          ecoMode: matchingEco || null,
          name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
        };
      });

      setFansWithExtras(matched);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken]);

  const callService = async (domain: string, service: string, entityId: string, data?: object) => {
    if (!haUrl || !haToken) return;
    await fetch(`${haUrl}/api/services/${domain}/${service}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, ...data }),
    });
    setTimeout(fetchEntities, 300);
  };

  const toggleFan = (entityId: string) => callService('fan', 'toggle', entityId);

  const setFanSpeed = async (entityId: string, percentage: number) => {
    const fan = fansWithExtras.find(f => f.fan.entity_id === entityId)?.fan;
    if (fan?.state === 'off') {
      await callService('fan', 'turn_on', entityId);
    }
    await callService('fan', 'set_percentage', entityId, { percentage });
  };

  const toggleLight = (entityId: string) => callService('light', 'toggle', entityId);

  const setLightBrightness = (entityId: string, brightness: number) => {
    if (brightness === 0) {
      callService('light', 'turn_off', entityId);
    } else {
      callService('light', 'turn_on', entityId, { brightness });
    }
  };

  const toggleSwitch = (entityId: string) => callService('switch', 'toggle', entityId);

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 10000);
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

  if (error || fansWithExtras.length === 0) {
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
        padding: 12,
        gap: 16,
      }}>
        {fansWithExtras.map((data) => (
          <FanCard
            key={data.fan.entity_id}
            data={data}
            onToggleFan={() => toggleFan(data.fan.entity_id)}
            onSetSpeed={(pct) => setFanSpeed(data.fan.entity_id, pct)}
            onToggleLight={() => data.light && toggleLight(data.light.entity_id)}
            onSetBrightness={(b) => data.light && setLightBrightness(data.light.entity_id, b)}
            onToggleWhoosh={() => data.whoosh && toggleSwitch(data.whoosh.entity_id)}
            onToggleEco={() => data.ecoMode && toggleSwitch(data.ecoMode.entity_id)}
          />
        ))}
      </div>
    </div>
  );
}
