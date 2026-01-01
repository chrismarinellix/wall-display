import { useState } from 'react';
import { Settings, Lock, Unlock, ExternalLink, Copy, Check, Monitor } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

const SETUP_PASSWORD = '1234'; // Simple PIN for access

export function SetupScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const { settings, updateSettings } = useSettings();

  const haUrl = import.meta.env.VITE_HOME_ASSISTANT_URL || 'Not configured';

  const handlePinSubmit = () => {
    if (pin === SETUP_PASSWORD) {
      setIsUnlocked(true);
    } else {
      setPin('');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isUnlocked) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          gap: 24,
        }}
      >
        <Lock size={48} color="#666" />
        <div style={{ fontSize: 14, color: '#999', letterSpacing: '0.1em' }}>
          ENTER PIN TO ACCESS SETUP
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map((_, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: pin.length > i ? '#fff' : '#333',
                border: '1px solid #444',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 200, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
            <button
              key={num}
              onClick={() => {
                const newPin = pin + num;
                setPin(newPin);
                if (newPin.length === 4) {
                  if (newPin === SETUP_PASSWORD) {
                    setIsUnlocked(true);
                  } else {
                    setTimeout(() => setPin(''), 300);
                  }
                }
              }}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '1px solid #333',
                background: '#111',
                color: '#fff',
                fontSize: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const setupItems = [
    {
      id: 'ha-cert',
      title: 'Accept Home Assistant Certificate',
      description: 'Open this URL on each device and accept the security warning to enable smart home controls.',
      url: haUrl,
      action: 'Open & Accept Certificate',
    },
    {
      id: 'wall-display',
      title: 'Wall Display URL',
      description: 'Bookmark this on each device for quick access.',
      url: window.location.origin,
      action: 'Copy URL',
    },
  ];

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '32px 48px',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Settings size={24} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Device Setup</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Run these steps on each new device
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Unlock size={20} color="#22c55e" />
        </div>
      </div>

      {/* Setup Items */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 48px' }}>
        {setupItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              marginBottom: 24,
              padding: 24,
              background: '#111',
              borderRadius: 12,
              border: '1px solid #222',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
                  {item.description}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: '#000',
                    borderRadius: 8,
                    border: '1px solid #333',
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#22c55e',
                      wordBreak: 'break-all',
                    }}
                  >
                    {item.url}
                  </code>
                  <button
                    onClick={() => handleCopy(item.url, item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 8,
                      color: copied === item.id ? '#22c55e' : '#666',
                    }}
                    title="Copy"
                  >
                    {copied === item.id ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#22c55e',
                      color: '#000',
                      padding: '8px 16px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    Open <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Quick Tip */}
        <div
          style={{
            padding: 20,
            background: '#0a1628',
            borderRadius: 12,
            border: '1px solid #1e3a5f',
          }}
        >
          <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 8, fontWeight: 600 }}>
            QUICK TIP
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
            After accepting the Home Assistant certificate, refresh this page.
            The smart home controls should now appear on the home screen.
          </div>
        </div>

        {/* Display Settings */}
        <div
          style={{
            marginTop: 24,
            padding: 24,
            background: '#111',
            borderRadius: 12,
            border: '1px solid #222',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Monitor size={20} color="#666" />
            <div style={{ fontSize: 16, fontWeight: 500 }}>Display Settings</div>
          </div>

          {/* E-ink Mode Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#000',
              borderRadius: 8,
              border: '1px solid #333',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                E-ink Display Mode
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Disables animations for e-ink/e-paper displays
              </div>
            </div>
            <button
              onClick={() => updateSettings({ einkMode: !settings.einkMode })}
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                border: 'none',
                background: settings.einkMode ? '#22c55e' : '#333',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: settings.einkMode ? 27 : 3,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px 48px',
          borderTop: '1px solid #222',
          fontSize: 11,
          color: '#444',
          textAlign: 'center',
        }}
      >
        Tap elsewhere to exit setup
      </div>
    </div>
  );
}
