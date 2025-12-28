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

export function HomeAssistantScreen() {
  const [fan, setFan] = useState<FanEntity | null>(null);
  const [light, setLight] = useState<LightEntity | null>(null);
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

      // Find Master Bedroom fan
      const masterFan = data.find((e: FanEntity) =>
        e.entity_id.startsWith('fan.') &&
        (e.attributes.friendly_name?.toLowerCase().includes('master') ||
         e.entity_id.toLowerCase().includes('master'))
      );

      // Find matching light
      const masterLight = data.find((e: LightEntity) =>
        e.entity_id.startsWith('light.') &&
        (e.attributes.friendly_name?.toLowerCase().includes('master') ||
         e.entity_id.toLowerCase().includes('master'))
      );

      setFan(masterFan || null);
      setLight(masterLight || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken]);

  const toggleFan = async () => {
    if (!haUrl || !haToken || !fan) return;
    await fetch(`${haUrl}/api/services/fan/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: fan.entity_id }),
    });
    setTimeout(fetchEntities, 300);
  };

  const setFanSpeed = async (percentage: number) => {
    if (!haUrl || !haToken || !fan) return;
    if (fan.state === 'off') {
      await fetch(`${haUrl}/api/services/fan/turn_on`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: fan.entity_id }),
      });
    }
    await fetch(`${haUrl}/api/services/fan/set_percentage`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: fan.entity_id, percentage }),
    });
    setTimeout(fetchEntities, 300);
  };

  const toggleLight = async () => {
    if (!haUrl || !haToken || !light) return;
    await fetch(`${haUrl}/api/services/light/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: light.entity_id }),
    });
    setTimeout(fetchEntities, 300);
  };

  const setLightBrightness = async (brightness: number) => {
    if (!haUrl || !haToken || !light) return;
    const service = brightness === 0 ? 'turn_off' : 'turn_on';
    await fetch(`${haUrl}/api/services/light/${service}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: light.entity_id, ...(brightness > 0 && { brightness }) }),
    });
    setTimeout(fetchEntities, 300);
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 15000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  const fanIsOn = fan?.state === 'on';
  const lightIsOn = light?.state === 'on';
  const fanSpeed = fan?.attributes.percentage || 0;
  const currentSpeed = Math.round(fanSpeed / 14.29);
  const brightness = light?.attributes.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);

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

  if (error || !fan) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', gap: 12 }}>
        <AlertCircle size={24} color="#444" />
        <span style={{ fontSize: 12, color: '#444' }}>{error || 'Fan not found'}</span>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
      gap: 48,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Title */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: '#555',
      }}>
        Master Bedroom
      </div>

      {/* Fan Control */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>
        {/* Large Fan Icon */}
        <div
          onClick={toggleFan}
          style={{
            width: 120,
            height: 120,
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
              ? '0 0 40px rgba(255,255,255,0.05), inset 0 0 20px rgba(255,255,255,0.02)'
              : 'none',
            transition: 'all 0.4s ease',
          }}
        >
          <Fan
            size={48}
            color={fanIsOn ? '#fff' : '#333'}
            strokeWidth={1.5}
            style={{
              animation: fanIsOn ? `spin ${2.5 - (fanSpeed / 100) * 2}s linear infinite` : 'none',
              transition: 'color 0.3s ease',
            }}
          />
        </div>

        {/* Speed Label */}
        <div style={{
          fontSize: 32,
          fontWeight: 200,
          color: fanIsOn ? '#fff' : '#333',
          letterSpacing: '0.05em',
          transition: 'color 0.3s ease',
        }}>
          {fanIsOn ? `Speed ${currentSpeed}` : 'Off'}
        </div>

        {/* Speed Bars */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 60,
        }}>
          {[1, 2, 3, 4, 5, 6, 7].map((speed) => {
            const isActive = fanIsOn && currentSpeed >= speed;
            const height = 16 + speed * 6;
            return (
              <button
                key={speed}
                onClick={() => setFanSpeed(speed * 14.29)}
                style={{
                  width: 12,
                  height,
                  borderRadius: 4,
                  border: 'none',
                  background: isActive
                    ? `linear-gradient(180deg, #666 0%, #333 100%)`
                    : '#1a1a1a',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isActive ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Light Control */}
      {light && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          width: '100%',
          maxWidth: 300,
        }}>
          {/* Divider */}
          <div style={{
            width: 40,
            height: 1,
            background: '#222',
          }} />

          {/* Light Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            width: '100%',
          }}>
            {/* Light Icon */}
            <div
              onClick={toggleLight}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: lightIsOn ? '#2a2a1a' : '#111',
                border: lightIsOn ? '1px solid #444422' : '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <Lightbulb
                size={20}
                color={lightIsOn ? '#aa9944' : '#333'}
                fill={lightIsOn ? '#aa9944' : 'none'}
                strokeWidth={1.5}
              />
            </div>

            {/* Brightness Slider */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
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
                onChange={(e) => setLightBrightness(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: 4,
                  borderRadius: 2,
                  appearance: 'none',
                  background: `linear-gradient(to right, #444 0%, #444 ${brightnessPercent}%, #1a1a1a ${brightnessPercent}%, #1a1a1a 100%)`,
                  cursor: 'pointer',
                  opacity: lightIsOn ? 1 : 0.4,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
