import { useState, useEffect, useCallback } from 'react';
import { Fan, Lightbulb, AlertCircle, Thermometer, Wind, Leaf, Flame, Snowflake, Power, ChevronLeft, ChevronRight } from 'lucide-react';

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

interface ClimateEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    current_temperature?: number;
    current_humidity?: number;
    temperature?: number;
    target_temp_high?: number;
    target_temp_low?: number;
    hvac_modes?: string[];
    hvac_action?: string;
    min_temp?: number;
    max_temp?: number;
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

function ThermostatCard({
  climate,
  onSetTemp,
  onSetMode,
}: {
  climate: ClimateEntity;
  onSetTemp: (temp: number) => void;
  onSetMode: (mode: string) => void;
}) {
  const currentTemp = climate.attributes.current_temperature || 0;
  const targetTemp = climate.attributes.temperature || climate.attributes.target_temp_low || 0;
  const humidity = climate.attributes.current_humidity;
  const hvacAction = climate.attributes.hvac_action || 'idle';
  const mode = climate.state;
  const name = climate.attributes.friendly_name?.replace(' Thermostat', '') || 'Thermostat';

  const isHeating = hvacAction === 'heating';
  const isCooling = hvacAction === 'cooling';
  const isOff = mode === 'off';

  const getActionColor = () => {
    if (isHeating) return '#e05a33';
    if (isCooling) return '#2d8fd5';
    return '#999';
  };

  const getActionIcon = () => {
    if (isHeating) return <Flame size={20} color="#e05a33" />;
    if (isCooling) return <Snowflake size={20} color="#2d8fd5" />;
    if (isOff) return <Power size={20} color="#999" />;
    return <Thermometer size={20} color="#666" />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '10px 6px 8px',
      background: isOff ? '#fafafa' : '#fff',
      borderRadius: 8,
      border: isOff ? '1px solid #eee' : '1px solid #ddd',
      transition: 'all 0.2s ease',
    }}>
      {/* Header: Name + Humidity */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingBottom: 4,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: isOff ? '#888' : '#333',
        }}>
          {name}
        </span>
        {humidity !== undefined && (
          <span style={{ fontSize: 10, color: '#888' }}>
            {humidity}%
          </span>
        )}
      </div>

      {/* Current Temp + Icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: isOff ? '#eee' : '#f0f0f0',
          border: `2px solid ${getActionColor()}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {getActionIcon()}
        </div>
        <div style={{
          fontSize: 28,
          fontWeight: 300,
          color: isOff ? '#aaa' : '#333',
        }}>
          {currentTemp.toFixed(0)}°
        </div>
      </div>

      {/* Target Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <button
          onClick={() => onSetTemp(targetTemp - 1)}
          disabled={isOff}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            color: isOff ? '#ccc' : '#333',
            fontSize: 14,
            cursor: isOff ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >−</button>
        <div style={{ textAlign: 'center', minWidth: 36 }}>
          <div style={{ fontSize: 7, color: '#999', letterSpacing: '0.1em' }}>SET</div>
          <div style={{ fontSize: 14, color: isOff ? '#ccc' : '#333', fontWeight: 500 }}>
            {targetTemp.toFixed(0)}°
          </div>
        </div>
        <button
          onClick={() => onSetTemp(targetTemp + 1)}
          disabled={isOff}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            color: isOff ? '#ccc' : '#333',
            fontSize: 14,
            cursor: isOff ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >+</button>
      </div>

      {/* Mode Buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        {['off', 'heat', 'cool'].map((m) => (
          <button
            key={m}
            onClick={() => onSetMode(m)}
            style={{
              width: 26,
              height: 26,
              padding: 0,
              background: mode === m ? (m === 'heat' ? '#fef3f0' : m === 'cool' ? '#f0f7fe' : '#f0f0f0') : '#fff',
              border: mode === m
                ? `1px solid ${m === 'heat' ? '#e05a33' : m === 'cool' ? '#2d8fd5' : '#999'}`
                : '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: mode === m ? (m === 'heat' ? '#e05a33' : m === 'cool' ? '#2d8fd5' : '#666') : '#aaa',
            }}
          >
            {m === 'heat' && <Flame size={11} />}
            {m === 'cool' && <Snowflake size={11} />}
            {m === 'off' && <Power size={11} />}
          </button>
        ))}
      </div>

      {/* Status */}
      <div style={{
        fontSize: 8,
        color: getActionColor(),
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}>
        {hvacAction === 'idle' ? (isOff ? 'OFF' : 'IDLE') : hvacAction.toUpperCase()}
      </div>
    </div>
  );
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
  const isUnavailable = fan.state === 'unavailable';
  const fanIsOn = fan.state === 'on';
  const lightIsOn = light?.state === 'on';
  const fanSpeed = fan.attributes.percentage || 0;
  const currentSpeed = Math.round(fanSpeed / 14.29);
  const brightness = light?.attributes.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);
  const temp = temperature?.state ? parseFloat(temperature.state) : null;
  const whooshOn = whoosh?.state === 'on';
  const ecoOn = ecoMode?.state === 'on';

  // Show unavailable/offline state
  if (isUnavailable) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 8px',
        background: '#f8f8f8',
        borderRadius: 10,
        border: '1px solid #e0e0e0',
        opacity: 0.6,
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#999',
        }}>
          {name}
        </span>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#eee',
          border: '2px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Fan size={20} color="#bbb" strokeWidth={1.5} />
        </div>
        <div style={{
          fontSize: 10,
          fontWeight: 500,
          color: '#999',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Offline
        </div>
        <div style={{
          fontSize: 8,
          color: '#aaa',
        }}>
          Check power switch
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '10px 6px 8px',
      background: fanIsOn ? '#fff' : '#fafafa',
      borderRadius: 8,
      border: fanIsOn ? '1px solid #ddd' : '1px solid #eee',
      transition: 'all 0.2s ease',
    }}>
      {/* Header: Name + Temp */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingBottom: 4,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: fanIsOn ? '#333' : '#888',
        }}>
          {name}
        </span>
        {temp !== null && (
          <span style={{
            fontSize: 10,
            color: '#888',
            fontWeight: 500,
          }}>
            {temp.toFixed(0)}°
          </span>
        )}
      </div>

      {/* Fan + Speed Controls Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        justifyContent: 'center',
        padding: '4px 0',
      }}>
        {/* Left Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const newSpeed = Math.max(0, currentSpeed - 1);
            if (newSpeed === 0) {
              onToggleFan();
            } else {
              onSetSpeed(newSpeed * 14.29);
            }
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation',
          }}
        >
          <ChevronLeft size={16} color={fanIsOn ? '#333' : '#aaa'} strokeWidth={2} />
        </button>

        {/* Fan Icon + Speed */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleFan();
          }}
          role="button"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            minWidth: 50,
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: fanIsOn ? '#f0f0f0' : '#eee',
            border: fanIsOn ? '2px solid #333' : '2px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
          }}>
            <Fan
              size={18}
              color={fanIsOn ? '#333' : '#bbb'}
              strokeWidth={1.5}
              style={{
                animation: fanIsOn ? `spin ${Math.max(0.3, 2.5 - currentSpeed * 0.3)}s linear infinite` : 'none',
              }}
            />
          </div>
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: fanIsOn ? '#333' : '#aaa',
          }}>
            {fanIsOn ? currentSpeed : '–'}
          </span>
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!fanIsOn) {
              onSetSpeed(14.29);
            } else {
              const newSpeed = Math.min(7, currentSpeed + 1);
              onSetSpeed(newSpeed * 14.29);
            }
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation',
          }}
        >
          <ChevronRight size={16} color={fanIsOn ? '#333' : '#aaa'} strokeWidth={2} />
        </button>
      </div>

      {/* Speed dots - progressively larger */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'flex-end' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <div
            key={s}
            style={{
              width: 2 + s,
              height: 2 + s,
              borderRadius: '50%',
              background: fanIsOn && currentSpeed >= s ? '#333' : '#ddd',
              transition: 'background 0.15s ease',
            }}
          />
        ))}
      </div>

      {/* Whoosh + Eco toggles */}
      {(whoosh || ecoMode) && (
        <div style={{ display: 'flex', gap: 4 }}>
          {whoosh && (
            <button
              onClick={() => onToggleWhoosh()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 5px',
                background: whooshOn ? '#eee' : '#fff',
                border: whooshOn ? '1px solid #888' : '1px solid #ddd',
                borderRadius: 3,
                cursor: 'pointer',
                color: whooshOn ? '#333' : '#999',
                fontSize: 8,
              }}
            >
              <Wind size={8} /> W
            </button>
          )}
          {ecoMode && (
            <button
              onClick={() => onToggleEco()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '2px 5px',
                background: ecoOn ? '#e8f5e8' : '#fff',
                border: ecoOn ? '1px solid #5a8a5a' : '1px solid #ddd',
                borderRadius: 3,
                cursor: 'pointer',
                color: ecoOn ? '#5a8a5a' : '#999',
                fontSize: 8,
              }}
            >
              <Leaf size={8} /> E
            </button>
          )}
        </div>
      )}

      {/* Light Control */}
      {light && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          marginTop: 2,
          paddingTop: 4,
          borderTop: '1px solid #eee',
        }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLight();
            }}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: lightIsOn ? '1px solid #d4a84b' : '1px solid #ccc',
              background: lightIsOn ? '#fffbf0' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: lightIsOn ? '0 0 6px rgba(212,168,75,0.3)' : 'none',
            }}
          >
            <Lightbulb size={12} color={lightIsOn ? '#d4a84b' : '#aaa'} fill={lightIsOn ? '#d4a84b' : 'none'} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (lightIsOn) onSetBrightness(Math.max(0, brightness - 51));
            }}
            disabled={!lightIsOn}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1px solid #ddd',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: lightIsOn ? 'pointer' : 'default',
              opacity: lightIsOn ? 1 : 0.4,
            }}
          >
            <ChevronLeft size={10} color="#666" />
          </button>

          <span style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 11,
            color: lightIsOn ? '#333' : '#aaa',
          }}>
            {lightIsOn ? `${brightnessPercent}%` : 'Off'}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!lightIsOn) {
                onSetBrightness(128);
              } else {
                onSetBrightness(Math.min(255, brightness + 51));
              }
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1px solid #ddd',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={10} color="#666" />
          </button>
        </div>
      )}
    </div>
  );
}

export function HomeAssistantScreen() {
  const [fansWithExtras, setFansWithExtras] = useState<FanWithExtras[]>([]);
  const [thermostats, setThermostats] = useState<ClimateEntity[]>([]);
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

      const fans = data.filter((e: FanEntity) => e.entity_id.startsWith('fan.'));
      const lights = data.filter((e: LightEntity) => e.entity_id.startsWith('light.'));
      const sensors = data.filter((e: SensorEntity) => e.entity_id.startsWith('sensor.'));
      const switches = data.filter((e: SwitchEntity) => e.entity_id.startsWith('switch.'));

      console.log('[HA] Found fans:', fans.map((f: FanEntity) => f.entity_id));
      console.log('[HA] Found lights:', lights.map((l: LightEntity) => l.entity_id));
      const climates = data.filter((e: ClimateEntity) =>
        e.entity_id.startsWith('climate.') &&
        e.entity_id.toLowerCase().includes('hallway')
      );

      setThermostats(climates);

      const matched: FanWithExtras[] = fans.map((fan: FanEntity) => {
        const fanName = fan.attributes.friendly_name || fan.entity_id.split('.')[1];
        const baseName = fanName.toLowerCase().replace(' fan', '').replace('_fan', '').replace('fan.', '').trim();
        const baseId = fan.entity_id.split('.')[1];

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

      console.log('[HA] Matched fans with extras:', matched.map(m => ({ name: m.name, id: m.fan.entity_id, hasLight: !!m.light })));
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
    const payload = { entity_id: entityId, ...data };
    console.log(`[HA] Calling ${domain}.${service}`, payload);
    try {
      const response = await fetch(`${haUrl}/api/services/${domain}/${service}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error(`[HA] Service call failed: ${response.status}`, await response.text());
      } else {
        console.log(`[HA] Service call success: ${domain}.${service}`);
      }
      setTimeout(fetchEntities, 500);
    } catch (e) {
      console.error('[HA] Service call error:', e);
    }
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

  const setThermostatTemp = (entityId: string, temperature: number) => {
    callService('climate', 'set_temperature', entityId, { temperature });
  };

  const setThermostatMode = (entityId: string, hvac_mode: string) => {
    callService('climate', 'set_hvac_mode', entityId, { hvac_mode });
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 10000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  if (!haUrl || !haToken) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
        <AlertCircle size={32} color="#ccc" />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
        <Fan size={32} color="#999" style={{ animation: 'spin 2s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || (fansWithExtras.length === 0 && thermostats.length === 0)) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#faf9f6', gap: 12 }}>
        <AlertCircle size={24} color="#999" />
        <span style={{ fontSize: 12, color: '#999' }}>{error || 'No devices found'}</span>
      </div>
    );
  }

  const totalDevices = thermostats.length + fansWithExtras.length;

  return (
    <div style={{
      height: '100%',
      background: '#faf9f6',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .devices-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          padding: 6px;
          width: 100%;
          box-sizing: border-box;
          flex: 1;
          align-content: start;
        }

        /* 3 columns for 5+ devices on mobile landscape or small tablets */
        @media (min-width: 480px) and (max-width: 767px) {
          .devices-grid.many-devices {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Tablets */
        @media (min-width: 768px) {
          .devices-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 12px;
          }
        }

        /* Large tablets / small desktops */
        @media (min-width: 1024px) {
          .devices-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            padding: 16px;
            max-width: 1200px;
            margin: 0 auto;
          }
        }

        /* Large screens */
        @media (min-width: 1400px) {
          .devices-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
      `}</style>

      {/* Devices Grid */}
      <div className={`devices-grid ${totalDevices >= 5 ? 'many-devices' : ''}`}>
        {/* Thermostats */}
        {thermostats.map((climate) => (
          <ThermostatCard
            key={climate.entity_id}
            climate={climate}
            onSetTemp={(temp) => setThermostatTemp(climate.entity_id, temp)}
            onSetMode={(mode) => setThermostatMode(climate.entity_id, mode)}
          />
        ))}
        {/* Fans */}
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
