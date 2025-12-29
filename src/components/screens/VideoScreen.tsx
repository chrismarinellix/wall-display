import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

export function VideoScreen() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [cameraEntityId, setCameraEntityId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<number | null>(null);

  const haUrl = import.meta.env.VITE_HOME_ASSISTANT_URL;
  const haToken = import.meta.env.VITE_HOME_ASSISTANT_TOKEN;

  // Find camera entity on mount
  const findCamera = useCallback(async () => {
    if (!haUrl || !haToken) return;

    try {
      const response = await fetch(`${haUrl}/api/states`, {
        headers: { Authorization: `Bearer ${haToken}` },
      });
      if (!response.ok) {
        console.log('[VideoScreen] Failed to fetch states:', response.status);
        return;
      }

      const entities = await response.json();
      const cameras = entities.filter((e: { entity_id: string }) => e.entity_id.startsWith('camera.'));
      console.log('[VideoScreen] Found cameras:', cameras.map((c: { entity_id: string }) => c.entity_id));

      const camera = cameras.find((e: { entity_id: string }) =>
        e.entity_id.includes('reolink') || e.entity_id.includes('rlc') || e.entity_id.includes('fluent')
      ) || cameras[0];

      if (camera) {
        console.log('[VideoScreen] Using camera:', camera.entity_id);
        setCameraEntityId(camera.entity_id);
      } else {
        console.log('[VideoScreen] No camera found in', cameras.length, 'entities');
      }
    } catch (e) {
      console.error('[VideoScreen] Failed to find camera:', e);
    }
  }, [haUrl, haToken]);

  // Fetch camera image with auth header and convert to blob URL
  const fetchCameraImage = useCallback(async () => {
    if (!haUrl || !haToken || !cameraEntityId) return;

    try {
      setLoading(true);
      const response = await fetch(`${haUrl}/api/camera_proxy/${cameraEntityId}`, {
        headers: { Authorization: `Bearer ${haToken}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Revoke old URL to prevent memory leak
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }

      setImageUrl(url);
      setError(null);
    } catch (e) {
      console.error('[VideoScreen] Failed to fetch image:', e);
      setError('Failed to load camera feed');
    } finally {
      setLoading(false);
    }
  }, [haUrl, haToken, cameraEntityId, imageUrl]);

  useEffect(() => {
    findCamera();
  }, [findCamera]);

  // Start fetching images once camera is found
  useEffect(() => {
    if (!cameraEntityId) return;

    // Initial fetch
    fetchCameraImage();

    // Auto-refresh every 2 seconds
    refreshIntervalRef.current = window.setInterval(fetchCameraImage, 2000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // Clean up blob URL
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [cameraEntityId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {loading && !imageUrl && (
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

        {error && !imageUrl ? (
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
              onClick={fetchCameraImage}
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
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Camera Feed"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : null}
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
          onClick={fetchCameraImage}
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
        {cameraEntityId.replace('camera.', '').replace(/_/g, ' ')}
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
