// Home Assistant WebSocket Service
// Connects via WebSocket to receive real-time events

const HA_URL = import.meta.env.VITE_HOME_ASSISTANT_URL || '';
const HA_TOKEN = import.meta.env.VITE_HOME_ASSISTANT_TOKEN || '';

// Convert HTTP URL to WebSocket URL
function getWebSocketUrl(): string {
  if (!HA_URL) return '';
  const url = new URL(HA_URL);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/api/websocket`;
}

export interface HAEvent {
  event_type: string;
  data: Record<string, unknown>;
  origin: string;
  time_fired: string;
}

type EventCallback = (event: HAEvent) => void;

class HomeAssistantConnection {
  private ws: WebSocket | null = null;
  private messageId = 1;
  private eventSubscribers: Map<string, Set<EventCallback>> = new Map();
  private connected = false;
  private reconnectTimer: number | null = null;
  private authenticated = false;

  connect(): void {
    const wsUrl = getWebSocketUrl();
    if (!wsUrl || !HA_TOKEN) {
      console.log('[HA WS] Not configured, skipping connection');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('[HA WS] Connecting to', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[HA WS] Connected');
      this.connected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('[HA WS] Parse error:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[HA WS] Disconnected');
      this.connected = false;
      this.authenticated = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[HA WS] Error:', error);
    };
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'auth_required':
        this.authenticate();
        break;

      case 'auth_ok':
        console.log('[HA WS] Authenticated');
        this.authenticated = true;
        this.subscribeToEvents();
        break;

      case 'auth_invalid':
        console.error('[HA WS] Authentication failed');
        break;

      case 'event':
        this.handleEvent(msg.event as HAEvent);
        break;

      case 'result':
        if (msg.success) {
          console.log('[HA WS] Subscribed to events');
        }
        break;
    }
  }

  private authenticate(): void {
    this.send({
      type: 'auth',
      access_token: HA_TOKEN,
    });
  }

  private subscribeToEvents(): void {
    // Subscribe to all events - we'll filter on our side
    this.send({
      id: this.messageId++,
      type: 'subscribe_events',
    });
  }

  private handleEvent(event: HAEvent): void {
    // Notify subscribers for this event type
    const callbacks = this.eventSubscribers.get(event.event_type);
    if (callbacks) {
      callbacks.forEach((cb) => cb(event));
    }

    // Also notify "all" subscribers
    const allCallbacks = this.eventSubscribers.get('*');
    if (allCallbacks) {
      allCallbacks.forEach((cb) => cb(event));
    }
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  subscribeEvent(eventType: string, callback: EventCallback): () => void {
    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, new Set());
    }
    this.eventSubscribers.get(eventType)!.add(callback);

    // Connect if not already connected
    if (!this.connected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.eventSubscribers.get(eventType)?.delete(callback);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
  }

  isConnected(): boolean {
    return this.connected && this.authenticated;
  }
}

// Singleton instance
export const haConnection = new HomeAssistantConnection();

// Helper to subscribe to play_announcement events
export function onPlayAnnouncement(
  callback: (data: { type?: string; filename?: string; hour?: string }) => void
): () => void {
  return haConnection.subscribeEvent('play_announcement', (event) => {
    callback(event.data as { type?: string; filename?: string; hour?: string });
  });
}

// Get the base URL for announcements (served from HA's www folder)
export function getAnnouncementUrl(filename: string): string {
  if (!HA_URL) return '';
  return `${HA_URL}/local/announcements/${filename}`;
}
