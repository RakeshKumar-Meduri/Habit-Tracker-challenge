export type RealtimeEventType =
  | 'CONNECTED'
  | 'CLIENT_COUNT'
  | 'IDENTIFY'
  | 'USER_REGISTERED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'DAILY_LOG_UPDATED'
  | 'WORKOUTS_ADDED'
  | 'WORKOUT_DELETED'
  | 'WORKOUTS_CLEARED'
  | 'WEIGHT_LOG_ADDED'
  | 'MISSED_REASON_ADDED'
  | 'MISSED_REASON_DELETED'
  | 'REACTION_ADDED'
  | 'BADGES_UPDATED'
  | 'SUPPLEMENT_ADDED'
  | 'SUPPLEMENT_DELETED'
  | 'SUPPLEMENT_LOG_UPDATED'
  | 'CUSTOM_HABIT_ADDED'
  | 'CUSTOM_HABIT_DELETED'
  | 'CUSTOM_HABIT_LOG_UPDATED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'GROUP_UPDATED'
  | 'INVITE_CREATED'
  | 'INVITE_REVOKED'
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
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.ensureConnected());
      window.addEventListener('online', () => this.ensureConnected());
      window.addEventListener('pageshow', () => this.ensureConnected());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.ensureConnected();
        }
      });
    }
  }

  public ensureConnected() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.connect();
    } else if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      } catch {
        this.handleDisconnect();
      }
    }
  }

  public forceReconnect() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.connect();
  }

  public identify(userId?: string | null, token?: string | null) {
    if (userId !== undefined) {
      this.currentUserId = userId || null;
    }
    let sessionToken = token;
    if (!sessionToken && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('pulse_fitness_auth_session');
        if (raw) {
          const s = JSON.parse(raw);
          sessionToken = s?.token;
        }
      } catch {}
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'IDENTIFY',
          payload: { 
            userId: this.currentUserId,
            token: sessionToken || null,
          },
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
      let wsUrl: string;
      if (import.meta.env.VITE_API_URL) {
        try {
          const parsed = new URL(import.meta.env.VITE_API_URL);
          const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${wsProtocol}//${parsed.host}/ws`;
        } catch {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/ws`;
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

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
