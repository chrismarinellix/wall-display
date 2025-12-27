import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Home, Thermometer, Lightbulb, Lock, DoorOpen, Droplets, Zap, AlertCircle } from 'lucide-react';

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    unit_of_measurement?: string;
    device_class?: string;
    icon?: string;
    [key: string]: unknown;
  };
  last_changed: string;
}

interface EntityCardProps {
  entity: HAEntity;
  onToggle?: () => void;
}

function getEntityIcon(entity: HAEntity) {
  const domain = entity.entity_id.split('.')[0];
  const deviceClass = entity.attributes.device_class;

  if (domain === 'light') return <Lightbulb size={20} />;
  if (domain === 'lock') return <Lock size={20} />;
  if (domain === 'door' || deviceClass === 'door') return <DoorOpen size={20} />;
  if (domain === 'sensor') {
    if (deviceClass === 'temperature') return <Thermometer size={20} />;
    if (deviceClass === 'humidity') return <Droplets size={20} />;
    if (deviceClass === 'power' || deviceClass === 'energy') return <Zap size={20} />;
  }
  if (domain === 'climate') return <Thermometer size={20} />;
  return <Home size={20} />;
}

function EntityCard({ entity, onToggle }: EntityCardProps) {
  const domain = entity.entity_id.split('.')[0];
  const isToggleable = ['light', 'switch', 'lock', 'fan'].includes(domain);
  const isOn = entity.state === 'on' || entity.state === 'locked';

  const displayValue = () => {
    if (domain === 'sensor') {
      return `${entity.state}${entity.attributes.unit_of_measurement || ''}`;
    }
    if (domain === 'climate') {
      const temp = entity.attributes.current_temperature || entity.state;
      return `${temp}°`;
    }
    return entity.state;
  };

  return (
    <div
      onClick={isToggleable ? onToggle : undefined}
      style={{
        padding: 16,
        backgroundColor: isOn ? '#f0fdf4' : '#fafafa',
        borderRadius: 8,
        cursor: isToggleable ? 'pointer' : 'default',
        border: isOn ? '1px solid #86efac' : '1px solid #e5e5e5',
        transition: 'all 0.2s',
      }}
    >
      <div className="flex" style={{ alignItems: 'center', gap: 12 }}>
        <div style={{ color: isOn ? '#22c55e' : '#999' }}>
          {getEntityIcon(entity)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
            {entity.attributes.friendly_name || entity.entity_id}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {displayValue()}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeAssistantScreen() {
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

      const data: HAEntity[] = await response.json();

      // Filter to useful entities
      const domains = ['light', 'switch', 'sensor', 'climate', 'lock', 'binary_sensor'];
      const deviceClasses = ['temperature', 'humidity', 'power', 'energy', 'door', 'window', 'motion'];

      const filtered = data.filter(entity => {
        const domain = entity.entity_id.split('.')[0];
        if (!domains.includes(domain)) return false;

        // For sensors, only show useful device classes
        if (domain === 'sensor' || domain === 'binary_sensor') {
          return deviceClasses.includes(entity.attributes.device_class || '');
        }

        return true;
      });

      // Sort: lights first, then switches, then sensors
      const sorted = filtered.sort((a, b) => {
        const order = ['light', 'switch', 'climate', 'lock', 'sensor', 'binary_sensor'];
        const aOrder = order.indexOf(a.entity_id.split('.')[0]);
        const bOrder = order.indexOf(b.entity_id.split('.')[0]);
        return aOrder - bOrder;
      });

      setEntities(sorted.slice(0, 12)); // Limit to 12 entities
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken]);

  const toggleEntity = async (entityId: string) => {
    if (!haUrl || !haToken) return;

    const domain = entityId.split('.')[0];
    const service = domain === 'lock' ? 'lock' : 'toggle';

    try {
      await fetch(`${haUrl}/api/services/${domain}/${service}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${haToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entity_id: entityId }),
      });

      // Refresh after toggle
      setTimeout(fetchEntities, 500);
    } catch (e) {
      console.error('Failed to toggle entity:', e);
    }
  };

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchEntities]);

  if (!haUrl || !haToken) {
    return (
      <div className="flex flex--col" style={{ height: '100%' }}>
        <div className="flex" style={{ alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Home size={24} />
          <span className="label">HOME ASSISTANT</span>
        </div>
        <div className="flex flex--center flex-1 flex--col" style={{ gap: 16 }}>
          <AlertCircle size={32} style={{ color: '#999' }} />
          <span style={{ color: '#666', fontSize: 14 }}>Home Assistant not configured</span>
          <div style={{ color: '#999', fontSize: 12, maxWidth: 300, textAlign: 'center' }}>
            Add these to your .env.local:
            <pre style={{ marginTop: 8, textAlign: 'left', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 11 }}>
{`VITE_HOME_ASSISTANT_URL=http://homeassistant.local:8123
VITE_HOME_ASSISTANT_TOKEN=your_long_lived_token`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex flex--between" style={{ alignItems: 'center', marginBottom: 20 }}>
        <div className="flex" style={{ alignItems: 'center', gap: 12 }}>
          <Home size={20} />
          <span className="label">HOME</span>
          {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
        </div>
        <button
          onClick={fetchEntities}
          style={{
            background: 'none',
            border: '1px solid #e5e5e5',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Entities grid */}
      {entities.length === 0 && !loading ? (
        <div className="flex flex--center flex-1">
          <span style={{ color: '#999', fontSize: 14 }}>No entities found</span>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            flex: 1,
            overflow: 'auto',
          }}
        >
          {entities.map(entity => (
            <EntityCard
              key={entity.entity_id}
              entity={entity}
              onToggle={() => toggleEntity(entity.entity_id)}
            />
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastUpdate && (
        <div style={{ fontSize: 11, color: '#999', textAlign: 'center', paddingTop: 12 }}>
          Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}
