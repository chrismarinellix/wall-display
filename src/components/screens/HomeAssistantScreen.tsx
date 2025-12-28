import { useState, useEffect, useCallback } from 'react';
import { Fan, ChevronDown, ChevronUp, Sun, Wind, AlertCircle } from 'lucide-react';

interface FanEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    percentage?: number;
    percentage_step?: number;
    preset_modes?: string[];
    preset_mode?: string;
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
  fan: FanEntity | null;
  light: LightEntity | null;
  name: string;
}

const SPEED_LABELS = ['Off', '1', '2', '3', '4', '5', '6', '7'];

function FanLozenge({
  fanData,
  onToggleFan,
  onSetSpeed,
  onToggleLight,
  onSetBrightness
}: {
  fanData: FanWithLight;
  onToggleFan: () => void;
  onSetSpeed: (percentage: number) => void;
  onToggleLight: () => void;
  onSetBrightness: (brightness: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { fan, light, name } = fanData;

  const fanIsOn = fan?.state === 'on';
  const lightIsOn = light?.state === 'on';
  const currentSpeed = fan?.attributes.percentage ? Math.round(fan.attributes.percentage / 14.28) : 0;
  const currentBrightness = light?.attributes.brightness || 0;
  const brightnessPercent = Math.round((currentBrightness / 255) * 100);

  return (
    <div
      style={{
        background: '#f5f5f5',
        borderRadius: 16,
        padding: 20,
        border: '1px solid #e0e0e0',
        flex: 1,
      }}
    >
      {/* Main row - fan name and toggle */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: fanIsOn ? '#333' : '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Fan
              size={20}
              color={fanIsOn ? '#fff' : '#999'}
              style={{
                animation: fanIsOn ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>
              {name}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {fanIsOn ? `Speed ${currentSpeed}` : 'Off'}
              {light && ` · Light ${lightIsOn ? `${brightnessPercent}%` : 'Off'}`}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} color="#666" />
        ) : (
          <ChevronDown size={20} color="#666" />
        )}
      </div>

      {/* Expanded controls */}
      {expanded && (
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Fan speed control */}
          {fan && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Wind size={14} color="#666" />
                <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>Fan Speed</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {SPEED_LABELS.map((label, index) => {
                  const isActive = fanIsOn ? currentSpeed === index : index === 0;
                  return (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index === 0) {
                          onToggleFan();
                        } else {
                          onSetSpeed(index * 14.28);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        border: 'none',
                        borderRadius: 6,
                        background: isActive ? '#333' : '#e5e5e5',
                        color: isActive ? '#fff' : '#666',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Light brightness control */}
          {light && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sun size={14} color="#666" />
                <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>Light</span>
                <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
                  {lightIsOn ? `${brightnessPercent}%` : 'Off'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLight();
                  }}
                  style={{
                    width: 40,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    background: lightIsOn ? '#333' : '#e5e5e5',
                    color: lightIsOn ? '#fff' : '#666',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {lightIsOn ? 'ON' : 'OFF'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={currentBrightness}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSetBrightness(parseInt(e.target.value));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    height: 6,
                    accentColor: '#333',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HomeAssistantScreen() {
  const [fans, setFans] = useState<FanWithLight[]>([]);
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

      // Find fans and their associated lights
      const fanEntities = data.filter((e: FanEntity) => e.entity_id.startsWith('fan.'));
      const lightEntities = data.filter((e: LightEntity) => e.entity_id.startsWith('light.'));

      // Match fans with their lights (by name similarity)
      const fansWithLights: FanWithLight[] = fanEntities.slice(0, 2).map((fan: FanEntity) => {
        const fanName = fan.attributes.friendly_name || fan.entity_id.split('.')[1];
        // Try to find a matching light (e.g., "Office Fan" -> "Office Fan Light")
        const matchingLight = lightEntities.find((light: LightEntity) => {
          const lightName = light.attributes.friendly_name || '';
          return lightName.toLowerCase().includes(fanName.toLowerCase().replace(' fan', '').trim());
        });

        return {
          fan,
          light: matchingLight || null,
          name: fanName.replace(' Fan', '').replace(' fan', ''),
        };
      });

      setFans(fansWithLights);
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
      await fetch(`${haUrl}/api/services/light/turn_on`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId, brightness }),
      });
      setTimeout(fetchEntities, 300);
    } catch (e) {
      console.error('Failed to set brightness:', e);
    }
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 30000);
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
      padding: 24,
      gap: 16,
    }}>
      {fans.map((fanData, index) => (
        <FanLozenge
          key={fanData.fan?.entity_id || index}
          fanData={fanData}
          onToggleFan={() => fanData.fan && toggleFan(fanData.fan.entity_id)}
          onSetSpeed={(pct) => fanData.fan && setFanSpeed(fanData.fan.entity_id, pct)}
          onToggleLight={() => fanData.light && toggleLight(fanData.light.entity_id)}
          onSetBrightness={(b) => fanData.light && setLightBrightness(fanData.light.entity_id, b)}
        />
      ))}

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
