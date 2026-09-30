export type RealtimeEventType =
  | 'CONNECTED'
  | 'CLIENT_COUNT'
  | 'IDENTIFY'
  | 'USER_REGISTERED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'DAILY_LOG_UPDATED'
  | 'WORKOUTS_ADDED'
  | 'WEIGHT_LOG_ADDED'
  | 'MISSED_REASON_ADDED'
  | 'REACTION_ADDED'
  | 'BADGES_UPDATED'
  | 'SUPPLEMENT_ADDED'
  | 'SUPPLEMENT_DELETED'
  | 'SUPPLEMENT_LOG_UPDATED'
  | 'CUSTOM_HABIT_ADDED'
  | 'CUSTOM_HABIT_DELETED'
  | 'CUSTOM_HABIT_LOG_UPDATED'
  | 'FULL_SYNC';

export interface RealtimeMessage {
  type: RealtimeEventType;
  payload: any;
}

export type RealtimeListener = (message: RealtimeMessage) => void;
export type StatusListener = (status: { isConnected: boolean; clientCount: number }) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isConnected = false;
  private clientCount = 1;
  private shouldReconnect = true;
  private currentUserId: string | null = null;

  constructor() {
    this.connect();
  }

  public identify(userId: string | null | undefined) {
    this.currentUserId = userId || null;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'IDENTIFY',
          payload: { userId: this.currentUserId },
        }));
      } catch (err) {
        console.error('[Realtime Identify Error]', err);
      }
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus();
        this.startHeartbeat();
        if (this.currentUserId) {
          this.identify(this.currentUserId);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RealtimeMessage;
          if (msg.type === 'CONNECTED' && msg.payload?.clientCount) {
            this.clientCount = msg.payload.clientCount;
            this.notifyStatus();
          } else if (msg.type === 'CLIENT_COUNT' && msg.payload?.clientCount !== undefined) {
            this.clientCount = msg.payload.clientCount;
            this.notifyStatus();
          }

          // Broadcast to all application listeners
          for (const listener of this.listeners) {
            try {
              listener(msg);
            } catch (err) {
              console.error('[Realtime Listener Error]', err);
            }
          }
        } catch (err) {
          console.error('[Realtime Parse Error]', err);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };
    } catch (err) {
      console.error('[Realtime Connect Error]', err);
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.isConnected = false;
    this.stopHeartbeat();
    this.notifyStatus();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.shouldReconnect && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {}
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private notifyStatus() {
    for (const listener of this.statusListeners) {
      try {
        listener({
          isConnected: this.isConnected,
          clientCount: this.clientCount,
        });
      } catch {}
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener({ isConnected: this.isConnected, clientCount: this.clientCount });
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus() {
    return { isConnected: this.isConnected, clientCount: this.clientCount };
  }
}

export const realtimeClient = new RealtimeClient();
