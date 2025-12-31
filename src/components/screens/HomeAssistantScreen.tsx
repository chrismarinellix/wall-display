import { useState, useEffect, useCallback } from 'react';
import {
  Fan, Lightbulb, AlertCircle, Thermometer, Wind, Leaf, Flame, Snowflake, Power,
  ChevronLeft, ChevronRight, Tv, Speaker, Volume2, VolumeX, Shirt, Eye, Dog, Car, User
} from 'lucide-react';

interface Entity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    [key: string]: unknown;
  };
}

interface FanEntity extends Entity {
  attributes: {
    friendly_name?: string;
    percentage?: number;
    percentage_step?: number;
  };
}

interface LightEntity extends Entity {
  attributes: {
    friendly_name?: string;
    brightness?: number;
  };
}

interface SensorEntity extends Entity {
  attributes: {
    friendly_name?: string;
    unit_of_measurement?: string;
  };
}

interface SwitchEntity extends Entity {
  attributes: {
    friendly_name?: string;
  };
}

interface ClimateEntity extends Entity {
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

interface MediaPlayerEntity extends Entity {
  attributes: {
    friendly_name?: string;
    volume_level?: number;
    is_volume_muted?: boolean;
    source?: string;
    media_title?: string;
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

// Compact Light Card
function LightCard({
  light,
  onToggle,
}: {
  light: LightEntity;
  onToggle: () => void;
}) {
  const isOn = light.state === 'on';
  const name = light.attributes.friendly_name?.replace(' Light', '').replace(' light', '') ||
               light.entity_id.split('.')[1].replace(/_/g, ' ');
  const brightness = light.attributes.brightness || 0;
  const brightnessPercent = Math.round((brightness / 255) * 100);

  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 4px',
        background: isOn ? '#fffbf0' : '#fff',
        borderRadius: 8,
        border: isOn ? '1px solid #d4a84b' : '1px solid #e0e0e0',
        cursor: 'pointer',
        minWidth: 60,
        transition: 'all 0.2s',
      }}
    >
      <Lightbulb
        size={20}
        color={isOn ? '#d4a84b' : '#aaa'}
        fill={isOn ? '#d4a84b' : 'none'}
        style={{ filter: isOn ? 'drop-shadow(0 0 4px rgba(212,168,75,0.5))' : 'none' }}
      />
      <span style={{
        fontSize: 9,
        fontWeight: 500,
        color: isOn ? '#333' : '#888',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: 56,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      {isOn && (
        <span style={{ fontSize: 8, color: '#999' }}>{brightnessPercent}%</span>
      )}
    </button>
  );
}

// Media Player Card
function MediaCard({
  media,
  onToggle,
  onMute,
}: {
  media: MediaPlayerEntity;
  onToggle: () => void;
  onMute: () => void;
}) {
  const isOn = media.state !== 'off' && media.state !== 'unavailable';
  const isMuted = media.attributes.is_volume_muted;
  const name = media.attributes.friendly_name?.replace('Samsung ', '').replace(' Series 65', '') ||
               media.entity_id.split('.')[1].replace(/_/g, ' ');
  const volume = media.attributes.volume_level ? Math.round(media.attributes.volume_level * 100) : 0;

  const getIcon = () => {
    if (name.toLowerCase().includes('soundbar') || name.toLowerCase().includes('speaker')) {
      return <Speaker size={18} />;
    }
    return <Tv size={18} />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 6px',
      background: isOn ? '#f0f4ff' : '#fff',
      borderRadius: 8,
      border: isOn ? '1px solid #5a7fd5' : '1px solid #e0e0e0',
      minWidth: 70,
    }}>
      <button
        onClick={onToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: isOn ? '#5a7fd5' : '#aaa',
          padding: 4,
        }}
      >
        {getIcon()}
      </button>
      <span style={{
        fontSize: 9,
        fontWeight: 500,
        color: isOn ? '#333' : '#888',
        textAlign: 'center',
        maxWidth: 64,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      {isOn && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onMute}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            {isMuted ? <VolumeX size={12} color="#999" /> : <Volume2 size={12} color="#5a7fd5" />}
          </button>
          <span style={{ fontSize: 9, color: '#666' }}>{volume}%</span>
        </div>
      )}
    </div>
  );
}

// Dryer Status Card
function DryerCard({ sensors }: { sensors: SensorEntity[] }) {
  const machineState = sensors.find(s => s.entity_id.includes('machine_state'));
  const completionTime = sensors.find(s => s.entity_id.includes('completion_time'));
  const jobState = sensors.find(s => s.entity_id.includes('job_state'));

  const state = machineState?.state || 'unknown';
  const isRunning = state === 'run' || state === 'running';
  const isDone = state === 'stop' || state === 'finished';

  let timeRemaining = '';
  if (completionTime?.state && completionTime.state !== 'unknown') {
    const completion = new Date(completionTime.state);
    const now = new Date();
    const diffMs = completion.getTime() - now.getTime();
    if (diffMs > 0) {
      const mins = Math.round(diffMs / 60000);
      timeRemaining = mins > 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      background: isRunning ? '#fff8f0' : isDone ? '#f0fff4' : '#fff',
      borderRadius: 8,
      border: isRunning ? '1px solid #e0a040' : isDone ? '1px solid #40c060' : '1px solid #e0e0e0',
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: isRunning ? '#fff0e0' : '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}>
        <Shirt size={18} color={isRunning ? '#e0a040' : isDone ? '#40c060' : '#999'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>Dryer</div>
        <div style={{ fontSize: 10, color: '#666', textTransform: 'capitalize' }}>
          {jobState?.state || state}
        </div>
      </div>
      {timeRemaining && (
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#e0a040',
        }}>
          {timeRemaining}
        </div>
      )}
      {isDone && (
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#40c060',
          textTransform: 'uppercase',
        }}>
          Done!
        </div>
      )}
    </div>
  );
}

// Motion Detection Card
function MotionCard({ sensors }: { sensors: Entity[] }) {
  const motion = sensors.find(s => s.entity_id.includes('_motion') && !s.entity_id.includes('sense'));
  const person = sensors.find(s => s.entity_id.includes('_person'));
  const pet = sensors.find(s => s.entity_id.includes('_pet'));
  const vehicle = sensors.find(s => s.entity_id.includes('_vehicle'));

  const detections = [
    { entity: motion, icon: <Eye size={12} />, label: 'Motion' },
    { entity: person, icon: <User size={12} />, label: 'Person' },
    { entity: pet, icon: <Dog size={12} />, label: 'Pet' },
    { entity: vehicle, icon: <Car size={12} />, label: 'Vehicle' },
  ].filter(d => d.entity);

  const anyDetected = detections.some(d => d.entity?.state === 'on');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: anyDetected ? '#fff0f0' : '#fff',
      borderRadius: 8,
      border: anyDetected ? '1px solid #e05050' : '1px solid #e0e0e0',
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#333' }}>Camera:</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {detections.map((d, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 6px',
              borderRadius: 10,
              background: d.entity?.state === 'on' ? '#ffe0e0' : '#f5f5f5',
              color: d.entity?.state === 'on' ? '#c03030' : '#999',
              fontSize: 9,
            }}
          >
            {d.icon}
            {d.entity?.state === 'on' && <span>{d.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Temperature Display
function TempDisplay({ sensors }: { sensors: SensorEntity[] }) {
  const temps = sensors.filter(s =>
    s.entity_id.includes('temperature') &&
    !s.entity_id.includes('iphone')
  );

  if (temps.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
    }}>
      {temps.map(temp => {
        const name = temp.attributes.friendly_name?.replace(' Temperature', '').replace(' temperature', '') ||
                     temp.entity_id.split('.')[1].split('_')[0];
        const value = parseFloat(temp.state);
        if (isNaN(value)) return null;

        return (
          <div key={temp.entity_id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #e0e0e0',
          }}>
            <Thermometer size={12} color="#e05a33" />
            <span style={{ fontSize: 10, color: '#333', fontWeight: 500 }}>
              {name}: {value.toFixed(0)}°
            </span>
          </div>
        );
      })}
    </div>
  );
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
  const name = climate.attributes.friendly_name?.replace(' Thermostat', '').replace(' Auto Comfort', '') || 'Thermostat';

  const isHeating = hvacAction === 'heating';
  const isCooling = hvacAction === 'cooling';
  const isOff = mode === 'off';

  const getActionColor = () => {
    if (isHeating) return '#e05a33';
    if (isCooling) return '#2d8fd5';
    return '#999';
  };

  const getActionIcon = () => {
    if (isHeating) return <Flame size={16} color="#e05a33" />;
    if (isCooling) return <Snowflake size={16} color="#2d8fd5" />;
    if (isOff) return <Power size={16} color="#999" />;
    return <Thermometer size={16} color="#666" />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 6px',
      background: isOff ? '#fafafa' : '#fff',
      borderRadius: 8,
      border: isOff ? '1px solid #eee' : '1px solid #ddd',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingBottom: 4,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: isOff ? '#888' : '#333',
        }}>
          {name}
        </span>
        {humidity !== undefined && (
          <span style={{ fontSize: 9, color: '#888' }}>{humidity}%</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
        <div style={{
          width: 32,
          height: 32,
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
          fontSize: 24,
          fontWeight: 300,
          color: isOff ? '#aaa' : '#333',
        }}>
          {currentTemp.toFixed(0)}°
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onSetTemp(targetTemp - 1)}
          disabled={isOff}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            color: isOff ? '#ccc' : '#333',
            fontSize: 12,
            cursor: isOff ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >−</button>
        <div style={{ textAlign: 'center', minWidth: 32 }}>
          <div style={{ fontSize: 6, color: '#999', letterSpacing: '0.1em' }}>SET</div>
          <div style={{ fontSize: 12, color: isOff ? '#ccc' : '#333', fontWeight: 500 }}>
            {targetTemp.toFixed(0)}°
          </div>
        </div>
        <button
          onClick={() => onSetTemp(targetTemp + 1)}
          disabled={isOff}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            color: isOff ? '#ccc' : '#333',
            fontSize: 12,
            cursor: isOff ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >+</button>
      </div>

      <div style={{ display: 'flex', gap: 3 }}>
        {['off', 'heat', 'cool'].map((m) => (
          <button
            key={m}
            onClick={() => onSetMode(m)}
            style={{
              width: 22,
              height: 22,
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
            {m === 'heat' && <Flame size={10} />}
            {m === 'cool' && <Snowflake size={10} />}
            {m === 'off' && <Power size={10} />}
          </button>
        ))}
      </div>

      <div style={{
        fontSize: 7,
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
  onToggleWhoosh,
  onToggleEco,
}: {
  data: FanWithExtras;
  onToggleFan: () => void;
  onSetSpeed: (pct: number) => void;
  onToggleLight: () => void;
  onToggleWhoosh: () => void;
  onToggleEco: () => void;
}) {
  const { fan, light, temperature, whoosh, ecoMode, name } = data;
  const isUnavailable = fan.state === 'unavailable';
  const fanIsOn = fan.state === 'on';
  const lightIsOn = light?.state === 'on';
  const fanSpeed = fan.attributes.percentage || 0;
  const currentSpeed = Math.round(fanSpeed / 14.29);
  const temp = temperature?.state ? parseFloat(temperature.state) : null;
  const whooshOn = whoosh?.state === 'on';
  const ecoOn = ecoMode?.state === 'on';

  if (isUnavailable) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 6px',
        background: '#f8f8f8',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        opacity: 0.6,
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#999', textTransform: 'uppercase' }}>{name}</span>
        <Fan size={18} color="#bbb" />
        <span style={{ fontSize: 9, color: '#999' }}>Offline</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      padding: '8px 4px 6px',
      background: fanIsOn ? '#fff' : '#fafafa',
      borderRadius: 8,
      border: fanIsOn ? '1px solid #ddd' : '1px solid #eee',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingBottom: 3,
        borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: fanIsOn ? '#333' : '#888',
        }}>
          {name}
        </span>
        {temp !== null && (
          <span style={{ fontSize: 9, color: '#888', fontWeight: 500 }}>{temp.toFixed(0)}°</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
        <button
          onClick={() => {
            const newSpeed = Math.max(0, currentSpeed - 1);
            if (newSpeed === 0) onToggleFan();
            else onSetSpeed(newSpeed * 14.29);
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={14} color={fanIsOn ? '#333' : '#aaa'} />
        </button>

        <div onClick={onToggleFan} style={{ cursor: 'pointer', textAlign: 'center' }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: fanIsOn ? '#f0f0f0' : '#eee',
            border: fanIsOn ? '2px solid #333' : '2px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Fan
              size={16}
              color={fanIsOn ? '#333' : '#bbb'}
              style={{ animation: fanIsOn ? `spin ${Math.max(0.3, 2.5 - currentSpeed * 0.3)}s linear infinite` : 'none' }}
            />
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: fanIsOn ? '#333' : '#aaa' }}>
            {fanIsOn ? currentSpeed : '–'}
          </span>
        </div>

        <button
          onClick={() => {
            if (!fanIsOn) onSetSpeed(14.29);
            else onSetSpeed(Math.min(7, currentSpeed + 1) * 14.29);
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={14} color={fanIsOn ? '#333' : '#aaa'} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'flex-end' }}>
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <div
            key={s}
            style={{
              width: 2 + s * 0.5,
              height: 2 + s * 0.5,
              borderRadius: '50%',
              background: fanIsOn && currentSpeed >= s ? '#333' : '#ddd',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        {whoosh && (
          <button
            onClick={onToggleWhoosh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 4px',
              background: whooshOn ? '#eee' : '#fff',
              border: whooshOn ? '1px solid #888' : '1px solid #ddd',
              borderRadius: 3,
              cursor: 'pointer',
              color: whooshOn ? '#333' : '#999',
              fontSize: 7,
            }}
          >
            <Wind size={7} /> W
          </button>
        )}
        {ecoMode && (
          <button
            onClick={onToggleEco}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 4px',
              background: ecoOn ? '#e8f5e8' : '#fff',
              border: ecoOn ? '1px solid #5a8a5a' : '1px solid #ddd',
              borderRadius: 3,
              cursor: 'pointer',
              color: ecoOn ? '#5a8a5a' : '#999',
              fontSize: 7,
            }}
          >
            <Leaf size={7} /> E
          </button>
        )}
        {light && (
          <button
            onClick={onToggleLight}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 4px',
              background: lightIsOn ? '#fffbf0' : '#fff',
              border: lightIsOn ? '1px solid #d4a84b' : '1px solid #ddd',
              borderRadius: 3,
              cursor: 'pointer',
              color: lightIsOn ? '#d4a84b' : '#999',
              fontSize: 7,
            }}
          >
            <Lightbulb size={7} fill={lightIsOn ? '#d4a84b' : 'none'} /> L
          </button>
        )}
      </div>
    </div>
  );
}

export function HomeAssistantScreen() {
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
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
      setAllEntities(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken]);

  const callService = async (domain: string, service: string, entityId: string, data?: object) => {
    if (!haUrl || !haToken) return;
    try {
      await fetch(`${haUrl}/api/services/${domain}/${service}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${haToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: entityId, ...data }),
      });
      setTimeout(fetchEntities, 500);
    } catch (e) {
      console.error('[HA] Service call error:', e);
    }
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 10000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  // Parse entities
  const fans = allEntities.filter((e): e is FanEntity => e.entity_id.startsWith('fan.'));
  const lights = allEntities.filter((e): e is LightEntity =>
    e.entity_id.startsWith('light.') &&
    !e.entity_id.includes('ella') &&
    !e.entity_id.includes('olivier') &&
    !e.entity_id.includes('master_bedroom')
  );
  const sensors = allEntities.filter((e): e is SensorEntity => e.entity_id.startsWith('sensor.'));
  const switches = allEntities.filter((e): e is SwitchEntity => e.entity_id.startsWith('switch.'));
  const climates = allEntities.filter((e): e is ClimateEntity => e.entity_id.startsWith('climate.'));
  const mediaPlayers = allEntities.filter((e): e is MediaPlayerEntity =>
    e.entity_id.startsWith('media_player.') &&
    e.state !== 'unavailable'
  );
  const binarySensors = allEntities.filter(e => e.entity_id.startsWith('binary_sensor.rlc'));
  const dryerSensors = sensors.filter(s => s.entity_id.includes('tumble_dryer'));
  const tempSensors = sensors.filter(s => s.entity_id.includes('temperature'));

  // Build fan data
  const fansWithExtras: FanWithExtras[] = fans.map((fan) => {
    const baseId = fan.entity_id.split('.')[1];
    const fanName = fan.attributes.friendly_name || baseId;
    const baseName = fanName.toLowerCase().replace(' fan', '').replace('_fan', '').trim();

    return {
      fan,
      light: allEntities.find((l): l is LightEntity =>
        l.entity_id.startsWith('light.') && l.entity_id.toLowerCase().includes(baseId)
      ) || null,
      temperature: sensors.find(s => s.entity_id.toLowerCase().includes(baseId) && s.entity_id.includes('temperature')) || null,
      whoosh: switches.find(s => s.entity_id.toLowerCase().includes(baseId) && s.entity_id.includes('whoosh')) || null,
      ecoMode: switches.find(s => s.entity_id.toLowerCase().includes(baseId) && s.entity_id.includes('eco')) || null,
      name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
    };
  });

  // Filter thermostats (hallway for now)
  const thermostats = climates.filter(c => c.entity_id.includes('hallway'));

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

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#faf9f6', gap: 12 }}>
        <AlertCircle size={24} color="#999" />
        <span style={{ fontSize: 12, color: '#999' }}>{error}</span>
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
      padding: 8,
      gap: 8,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>

      {/* Temperature sensors row */}
      {tempSensors.length > 0 && <TempDisplay sensors={tempSensors} />}

      {/* Motion detection */}
      {binarySensors.length > 0 && <MotionCard sensors={binarySensors} />}

      {/* Dryer status */}
      {dryerSensors.length > 0 && <DryerCard sensors={dryerSensors} />}

      {/* Lights Section */}
      {lights.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Lights
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {lights.map(light => (
              <LightCard
                key={light.entity_id}
                light={light}
                onToggle={() => callService('light', 'toggle', light.entity_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Media Section */}
      {mediaPlayers.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Media
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {mediaPlayers.map(media => (
              <MediaCard
                key={media.entity_id}
                media={media}
                onToggle={() => callService('media_player', 'toggle', media.entity_id)}
                onMute={() => callService('media_player', 'volume_mute', media.entity_id, { is_volume_muted: !media.attributes.is_volume_muted })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Climate & Fans Grid */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Climate
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 6,
        }}>
          {thermostats.map(climate => (
            <ThermostatCard
              key={climate.entity_id}
              climate={climate}
              onSetTemp={(temp) => callService('climate', 'set_temperature', climate.entity_id, { temperature: temp })}
              onSetMode={(mode) => callService('climate', 'set_hvac_mode', climate.entity_id, { hvac_mode: mode })}
            />
          ))}
          {fansWithExtras.map(data => (
            <FanCard
              key={data.fan.entity_id}
              data={data}
              onToggleFan={() => callService('fan', 'toggle', data.fan.entity_id)}
              onSetSpeed={(pct) => callService('fan', 'set_percentage', data.fan.entity_id, { percentage: pct })}
              onToggleLight={() => data.light && callService('light', 'toggle', data.light.entity_id)}
              onToggleWhoosh={() => data.whoosh && callService('switch', 'toggle', data.whoosh.entity_id)}
              onToggleEco={() => data.ecoMode && callService('switch', 'toggle', data.ecoMode.entity_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
