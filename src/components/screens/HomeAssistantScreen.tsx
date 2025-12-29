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
      gap: 6,
      padding: '12px 8px',
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #e5e5e5',
    }}>
      {/* Title with Humidity */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#666',
        }}>
          {name}
        </span>
        {humidity !== undefined && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 9,
            color: '#666',
            background: '#f5f5f5',
            padding: '1px 4px',
            borderRadius: 3,
          }}>
            {humidity}%
          </span>
        )}
      </div>

      {/* Thermostat Circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: isOff
            ? '#f5f5f5'
            : `linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)`,
          border: `2px solid ${getActionColor()}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: (isHeating || isCooling)
            ? `0 0 12px ${getActionColor()}22`
            : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        {getActionIcon()}
      </div>

      {/* Current Temperature */}
      <div style={{
        fontSize: 24,
        fontWeight: 300,
        color: '#333',
        letterSpacing: '-0.02em',
      }}>
        {currentTemp.toFixed(0)}°
      </div>

      {/* Target Temperature Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
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
            fontSize: 16,
            cursor: isOff ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          −
        </button>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 7, color: '#999', letterSpacing: '0.1em' }}>TARGET</span>
          <span style={{ fontSize: 16, color: isOff ? '#ccc' : '#333', fontWeight: 300 }}>
            {targetTemp.toFixed(0)}°
          </span>
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
            fontSize: 16,
            cursor: isOff ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>

      {/* Mode Buttons - compact icons only */}
      <div style={{
        display: 'flex',
        gap: 4,
      }}>
        {['off', 'heat', 'cool'].map((m) => (
          <button
            key={m}
            onClick={() => onSetMode(m)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              padding: 0,
              background: mode === m ? (m === 'heat' ? '#fef3f0' : m === 'cool' ? '#f0f7fe' : '#f5f5f5') : '#fff',
              border: mode === m
                ? `1px solid ${m === 'heat' ? '#e05a33' : m === 'cool' ? '#2d8fd5' : '#ccc'}`
                : '1px solid #e5e5e5',
              borderRadius: 6,
              cursor: 'pointer',
              color: mode === m
                ? (m === 'heat' ? '#e05a33' : m === 'cool' ? '#2d8fd5' : '#666')
                : '#999',
            }}
          >
            {m === 'heat' && <Flame size={12} />}
            {m === 'cool' && <Snowflake size={12} />}
            {m === 'off' && <Power size={12} />}
          </button>
        ))}
      </div>

      {/* Status */}
      <div style={{
        fontSize: 8,
        color: getActionColor(),
        letterSpacing: '0.1em',
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
      gap: 6,
      padding: '12px 8px',
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #e5e5e5',
    }}>
      {/* Title with Temperature */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#666',
        }}>
          {name}
        </span>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontSize: 9,
          color: temp !== null ? '#666' : '#ccc',
          background: '#f5f5f5',
          padding: '1px 4px',
          borderRadius: 3,
        }}>
          <Thermometer size={8} />
          {temp !== null ? `${temp.toFixed(0)}°` : '--'}
        </span>
      </div>

      {/* Fan Icon */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleFan();
        }}
        role="button"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: fanIsOn
            ? 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)'
            : '#f5f5f5',
          border: fanIsOn ? '2px solid #333' : '2px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: fanIsOn
            ? '0 0 12px rgba(0,0,0,0.08)'
            : 'none',
        }}
      >
        <Fan
          size={20}
          color={fanIsOn ? '#333' : '#ccc'}
          strokeWidth={1.5}
          style={{
            animation: fanIsOn ? `spin ${Math.max(0.3, 2.5 - currentSpeed * 0.3)}s linear infinite` : 'none',
          }}
        />
      </div>

      {/* Speed Controls with Arrows */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {/* Left Arrow - Decrease */}
        <button
          type="button"
          role="button"
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1.5px solid #ccc',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
            touchAction: 'manipulation',
            userSelect: 'none',
          }}
        >
          <ChevronLeft size={18} color={fanIsOn ? '#333' : '#999'} strokeWidth={2} />
        </button>

        {/* Speed Display */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 32,
        }}>
          <div style={{
            fontSize: 22,
            fontWeight: 300,
            color: fanIsOn ? '#333' : '#ccc',
            lineHeight: 1,
          }}>
            {fanIsOn ? currentSpeed : '—'}
          </div>
          <div style={{
            fontSize: 7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#999',
            marginTop: 2,
          }}>
            {fanIsOn ? 'SPEED' : 'OFF'}
          </div>
        </div>

        {/* Right Arrow - Increase */}
        <button
          type="button"
          role="button"
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1.5px solid #ccc',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
            touchAction: 'manipulation',
            userSelect: 'none',
          }}
        >
          <ChevronRight size={18} color={fanIsOn ? '#333' : '#999'} strokeWidth={2} />
        </button>
      </div>

      {/* Speed indicator dots */}
      <div style={{
        display: 'flex',
        gap: 3,
      }}>
        {[1, 2, 3, 4, 5, 6, 7].map((speed) => (
          <div
            key={speed}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: fanIsOn && currentSpeed >= speed
                ? '#333'
                : '#ddd',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>

      {/* Feature toggles - compact */}
      <div style={{
        display: 'flex',
        gap: 4,
      }}>
        <button
          onClick={() => whoosh && onToggleWhoosh()}
          disabled={!whoosh}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '3px 6px',
            background: whooshOn ? '#f0f0f0' : '#fff',
            border: whooshOn ? '1px solid #999' : '1px solid #e5e5e5',
            borderRadius: 4,
            cursor: whoosh ? 'pointer' : 'default',
            color: whooshOn ? '#333' : '#999',
            fontSize: 7,
            fontWeight: 500,
            letterSpacing: '0.03em',
            opacity: whoosh ? 1 : 0.4,
          }}
        >
          <Wind size={9} />
          W
        </button>
        <button
          onClick={() => ecoMode && onToggleEco()}
          disabled={!ecoMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '3px 6px',
            background: ecoOn ? '#f0f8f0' : '#fff',
            border: ecoOn ? '1px solid #5a8a5a' : '1px solid #e5e5e5',
            borderRadius: 4,
            cursor: ecoMode ? 'pointer' : 'default',
            color: ecoOn ? '#5a8a5a' : '#999',
            fontSize: 7,
            fontWeight: 500,
            letterSpacing: '0.03em',
            opacity: ecoMode ? 1 : 0.4,
          }}
        >
          <Leaf size={9} />
          E
        </button>
      </div>

      {/* Light Control - compact row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        marginTop: 4,
        paddingTop: 6,
        borderTop: '1px solid #eee',
        opacity: light ? 1 : 0.4,
      }}>
        {/* Light Icon/Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            light && onToggleLight();
          }}
          disabled={!light}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: lightIsOn ? '1.5px solid #d4a84b' : '1.5px solid #ccc',
            background: lightIsOn ? '#fffbf0' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: light ? 'pointer' : 'default',
            flexShrink: 0,
            boxShadow: lightIsOn ? '0 0 8px rgba(212, 168, 75, 0.3)' : 'none',
            touchAction: 'manipulation',
            userSelect: 'none',
          }}
        >
          <Lightbulb
            size={14}
            color={lightIsOn ? '#d4a84b' : '#999'}
            fill={lightIsOn ? '#d4a84b' : 'none'}
            strokeWidth={1.5}
          />
        </button>

        {/* Decrease Brightness */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (light && lightIsOn) {
              const newBrightness = Math.max(0, brightness - 51);
              onSetBrightness(newBrightness);
            }
          }}
          disabled={!light || !lightIsOn}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid #ccc',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (light && lightIsOn) ? 'pointer' : 'default',
            opacity: (light && lightIsOn) ? 1 : 0.4,
            touchAction: 'manipulation',
            userSelect: 'none',
          }}
        >
          <ChevronLeft size={12} color="#666" strokeWidth={2} />
        </button>

        {/* Brightness Display */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 300,
            color: lightIsOn ? '#333' : '#ccc',
          }}>
            {light ? (lightIsOn ? `${brightnessPercent}%` : 'OFF') : 'N/A'}
          </div>
        </div>

        {/* Increase Brightness */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (light) {
              if (!lightIsOn) {
                onSetBrightness(128);
              } else {
                const newBrightness = Math.min(255, brightness + 51);
                onSetBrightness(newBrightness);
              }
            }
          }}
          disabled={!light}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid #ccc',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: light ? 'pointer' : 'default',
            opacity: light ? 1 : 0.4,
            touchAction: 'manipulation',
            userSelect: 'none',
          }}
        >
          <ChevronRight size={12} color="#666" strokeWidth={2} />
        </button>
      </div>
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

  return (
    <div style={{
      height: '100%',
      background: '#faf9f6',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .devices-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 8px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 600px) {
          .devices-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            padding: 16px;
          }
        }
        @media (min-width: 900px) {
          .devices-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 260px));
            gap: 20px;
            padding: 24px;
            justify-content: center;
          }
        }
      `}</style>

      {/* Devices Grid */}
      <div className="devices-grid">
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
