import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

export function VideoScreen() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [cameraEntityId, setCameraEntityId] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const haUrl = import.meta.env.VITE_HOME_ASSISTANT_URL;
  const haToken = import.meta.env.VITE_HOME_ASSISTANT_TOKEN;

  // Find camera entity on mount
  const findCamera = useCallback(async () => {
    if (!haUrl || !haToken) return;

    try {
      const response = await fetch(`${haUrl}/api/states`, {
        headers: { Authorization: `Bearer ${haToken}` },
      });
      if (!response.ok) return;

      const entities = await response.json();
      const camera = entities.find((e: { entity_id: string }) =>
        e.entity_id.startsWith('camera.') &&
        (e.entity_id.includes('reolink') || e.entity_id.includes('rlc') || e.entity_id.includes('backyard'))
      );

      if (camera) {
        setCameraEntityId(camera.entity_id);
      }
    } catch (e) {
      console.error('Failed to find camera:', e);
    }
  }, [haUrl, haToken]);

  useEffect(() => {
    findCamera();
  }, [findCamera]);

  // Get camera snapshot URL via Home Assistant proxy
  const getSnapshotUrl = () => {
    if (!haUrl || !haToken || !cameraEntityId) return null;
    return `${haUrl}/api/camera_proxy/${cameraEntityId}?token=${haToken}&t=${Date.now()}`;
  };

  const refreshImage = () => {
    setLastRefresh(Date.now());
    setLoading(true);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!fullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-refresh every 2 seconds for near-live view
  useEffect(() => {
    const interval = setInterval(refreshImage, 2000);
    return () => clearInterval(interval);
  }, []);

  const snapshotUrl = getSnapshotUrl();

  if (!haUrl || !haToken) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#666',
        gap: 12,
      }}>
        <AlertCircle size={32} />
        <span style={{ fontSize: 14 }}>Home Assistant not configured</span>
      </div>
    );
  }

  if (!cameraEntityId) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#888',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}>
        <Video size={48} color="#555" />
        <span style={{ fontSize: 16, fontWeight: 500 }}>No Camera Found</span>
        <span style={{ fontSize: 12, color: '#666', maxWidth: 300 }}>
          Add your Reolink camera in Home Assistant:
          <br />Settings → Devices & Services → Add Integration → Reolink
        </span>
        <button
          onClick={() => findCamera()}
          style={{
            marginTop: 8,
            padding: '8px 16px',
            background: '#333',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Camera Feed */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
          }}>
            <Video size={48} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        )}

        {error ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            color: '#666',
          }}>
            <AlertCircle size={32} />
            <span style={{ fontSize: 12 }}>{error}</span>
            <button
              onClick={refreshImage}
              style={{
                padding: '8px 16px',
                background: '#333',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : (
          <img
            ref={imgRef}
            key={lastRefresh}
            src={snapshotUrl || ''}
            alt="Camera Feed"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              opacity: loading ? 0.3 : 1,
              transition: 'opacity 0.2s ease',
            }}
            onLoad={() => {
              setLoading(false);
              setError(null);
            }}
            onError={() => {
              setLoading(false);
              setError('Failed to load camera feed');
            }}
          />
        )}
      </div>

      {/* Controls overlay */}
      <div style={{
        position: 'absolute',
        bottom: 60,
        right: 16,
        display: 'flex',
        gap: 8,
      }}>
        <button
          onClick={refreshImage}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={toggleFullscreen}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Camera name */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(0,0,0,0.6)',
        padding: '6px 12px',
        borderRadius: 6,
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.05em',
      }}>
        Backyard Camera
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
